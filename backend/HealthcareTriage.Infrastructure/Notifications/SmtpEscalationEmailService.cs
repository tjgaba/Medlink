using HealthcareTriage.Application.Notifications;
using HealthcareTriage.Domain.Entities;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Globalization;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;

namespace HealthcareTriage.Infrastructure.Notifications;

public sealed class SmtpEscalationEmailService : IEscalationEmailService
{
    private readonly SmtpEmailOptions _options;

    public SmtpEscalationEmailService(IOptions<SmtpEmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendEscalationEmailAsync(
        Case incident,
        Staff departmentLead,
        string escalationLevel,
        string reason,
        string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (!_options.IsConfigured)
        {
            throw new InvalidOperationException("SMTP email is not configured. Set Email:Smtp:Username, Email:Smtp:Password, and Email:Smtp:FromAddress.");
        }

        if (string.IsNullOrWhiteSpace(departmentLead.EmailAddress))
        {
            throw new InvalidOperationException($"Department lead '{departmentLead.Name}' does not have an email address.");
        }

        var subject = $"[{escalationLevel}] {incident.DisplayCode} escalation - {FormatDepartment(incident.Department.ToString())}";
        var body = BuildBody(incident, departmentLead, escalationLevel, reason, performedBy);

        if (TryGetOpenSslPath(out var configuredOpenSslPath))
        {
            await SendWithOpenSslAsync(
                configuredOpenSslPath,
                departmentLead.EmailAddress,
                departmentLead.Name,
                subject,
                body,
                cancellationToken);

            return;
        }

        try
        {
            await SendSmtpAsync(
                departmentLead.EmailAddress,
                departmentLead.Name,
                subject,
                body,
                cancellationToken);
        }
        catch (Exception) when (TryGetOpenSslPath(out var openSslPath))
        {
            await SendWithOpenSslAsync(
                openSslPath,
                departmentLead.EmailAddress,
                departmentLead.Name,
                subject,
                body,
                cancellationToken);
        }
    }

    private async Task SendSmtpAsync(
        string toAddress,
        string toName,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        using var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(_options.Host, _options.Port, cancellationToken);

        await using var networkStream = tcpClient.GetStream();
        var reader = new StreamReader(networkStream, Encoding.ASCII, leaveOpen: true);
        var writer = CreateWriter(networkStream);

        await ExpectAsync(reader, 220, "SMTP greeting", cancellationToken);
        await SendCommandAsync(writer, "EHLO medlink.local");
        await ExpectAsync(reader, 250, "SMTP EHLO", cancellationToken);

        if (_options.EnableSsl)
        {
            await SendCommandAsync(writer, "STARTTLS");
            await ExpectAsync(reader, 220, "SMTP STARTTLS", cancellationToken);

            var sslStream = new SslStream(networkStream, leaveInnerStreamOpen: false);
            await sslStream.AuthenticateAsClientAsync(_options.Host);
            reader = new StreamReader(sslStream, Encoding.ASCII, leaveOpen: true);
            writer = CreateWriter(sslStream);

            await SendCommandAsync(writer, "EHLO medlink.local");
            await ExpectAsync(reader, 250, "SMTP EHLO after STARTTLS", cancellationToken);
        }

        var authToken = Convert.ToBase64String(Encoding.UTF8.GetBytes($"\0{_options.Username}\0{_options.Password}"));
        await SendCommandAsync(writer, $"AUTH PLAIN {authToken}");
        await ExpectAsync(reader, 235, "SMTP authentication", cancellationToken);

        await SendCommandAsync(writer, $"MAIL FROM:<{_options.FromAddress}>");
        await ExpectAsync(reader, 250, "SMTP MAIL FROM", cancellationToken);

        await SendCommandAsync(writer, $"RCPT TO:<{toAddress}>");
        await ExpectAsync(reader, 250, "SMTP RCPT TO", cancellationToken);

        await SendCommandAsync(writer, "DATA");
        await ExpectAsync(reader, 354, "SMTP DATA", cancellationToken);

        await SendCommandAsync(writer, BuildMessage(toAddress, toName, subject, body));
        await SendCommandAsync(writer, ".");
        await ExpectAsync(reader, 250, "SMTP message send", cancellationToken);

        await SendCommandAsync(writer, "QUIT");
    }

    private async Task SendWithOpenSslAsync(
        string openSslPath,
        string toAddress,
        string toName,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        var authToken = Convert.ToBase64String(Encoding.UTF8.GetBytes($"\0{_options.Username}\0{_options.Password}"));
        var commands = string.Join("\r\n", new[]
        {
            "EHLO medlink.local",
            $"AUTH PLAIN {authToken}",
            $"MAIL FROM:<{_options.FromAddress}>",
            $"RCPT TO:<{toAddress}>",
            "DATA",
            DotStuff(BuildMessage(toAddress, toName, subject, body)),
            ".",
            "QUIT",
            string.Empty
        });

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = openSslPath,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        process.StartInfo.ArgumentList.Add("s_client");
        process.StartInfo.ArgumentList.Add("-starttls");
        process.StartInfo.ArgumentList.Add("smtp");
        process.StartInfo.ArgumentList.Add("-crlf");
        process.StartInfo.ArgumentList.Add("-connect");
        process.StartInfo.ArgumentList.Add($"{_options.Host}:{_options.Port}");
        process.StartInfo.ArgumentList.Add("-quiet");

        if (!process.Start())
        {
            throw new InvalidOperationException("OpenSSL SMTP sender could not be started.");
        }

        var outputTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var errorTask = process.StandardError.ReadToEndAsync(cancellationToken);

        await process.StandardInput.WriteAsync(commands.AsMemory(), cancellationToken);
        await process.StandardInput.FlushAsync(cancellationToken);
        process.StandardInput.Close();

        await process.WaitForExitAsync(cancellationToken);
        var output = await outputTask;
        var error = await errorTask;

        if (process.ExitCode != 0 ||
            !output.Contains("235 ", StringComparison.Ordinal) ||
            !output.Contains("250 2.0.0 OK", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"OpenSSL SMTP send failed: {SanitizeOpenSslOutput(output, error)}");
        }
    }

    private bool TryGetOpenSslPath(out string openSslPath)
    {
        var candidates = new List<string>();

        if (!string.IsNullOrWhiteSpace(_options.OpenSslPath))
        {
            candidates.Add(_options.OpenSslPath);
        }

        var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        if (!string.IsNullOrWhiteSpace(programFiles))
        {
            candidates.Add(Path.Combine(programFiles, "Git", "usr", "bin", "openssl.exe"));
            candidates.Add(Path.Combine(programFiles, "Git", "mingw64", "bin", "openssl.exe"));
        }

        var pathEntries = (Environment.GetEnvironmentVariable("PATH") ?? string.Empty)
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        candidates.AddRange(pathEntries.Select(path => Path.Combine(path, "openssl.exe")));

        openSslPath = candidates.FirstOrDefault(File.Exists) ?? string.Empty;
        return !string.IsNullOrWhiteSpace(openSslPath);
    }

    private StreamWriter CreateWriter(Stream stream)
    {
        return new StreamWriter(stream, Encoding.ASCII, leaveOpen: true)
        {
            AutoFlush = true,
            NewLine = "\r\n"
        };
    }

    private static async Task SendCommandAsync(StreamWriter writer, string command)
    {
        await writer.WriteLineAsync(command);
        await writer.FlushAsync();
    }

    private static async Task ExpectAsync(
        StreamReader reader,
        int expectedCode,
        string step,
        CancellationToken cancellationToken)
    {
        var reply = await ReadReplyAsync(reader, cancellationToken);
        if (reply.Code != expectedCode)
        {
            throw new InvalidOperationException($"{step} failed with SMTP {reply.Code}: {reply.Text}");
        }
    }

    private static async Task<SmtpReply> ReadReplyAsync(StreamReader reader, CancellationToken cancellationToken)
    {
        string? line;
        var text = new StringBuilder();
        int code = 0;

        do
        {
            line = await reader.ReadLineAsync(cancellationToken);
            if (line is null)
            {
                throw new InvalidOperationException("SMTP server closed the connection unexpectedly.");
            }

            if (line.Length >= 3 && int.TryParse(line[..3], out var parsedCode))
            {
                code = parsedCode;
            }

            if (text.Length > 0)
            {
                text.Append(' ');
            }

            text.Append(line);
        }
        while (line.Length > 3 && line[3] == '-');

        return new SmtpReply(code, text.ToString());
    }

    private string BuildMessage(string toAddress, string toName, string subject, string body)
    {
        var bodyBytes = Encoding.UTF8.GetBytes(body);
        var encodedBody = WrapBase64(Convert.ToBase64String(bodyBytes));

        return string.Join("\r\n", new[]
        {
            $"From: {FormatMailbox(_options.FromName, _options.FromAddress)}",
            $"To: {FormatMailbox(toName, toAddress)}",
            $"Subject: =?UTF-8?B?{Convert.ToBase64String(Encoding.UTF8.GetBytes(subject))}?=",
            $"Date: {DateTimeOffset.UtcNow.ToString("r", CultureInfo.InvariantCulture)}",
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=utf-8",
            "Content-Transfer-Encoding: base64",
            string.Empty,
            encodedBody
        });
    }

    private static string FormatMailbox(string name, string address)
    {
        return string.IsNullOrWhiteSpace(name)
            ? $"<{address}>"
            : $"\"{name.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal)}\" <{address}>";
    }

    private static string WrapBase64(string value)
    {
        var lines = new List<string>();
        for (var index = 0; index < value.Length; index += 76)
        {
            lines.Add(value.Substring(index, Math.Min(76, value.Length - index)));
        }

        return string.Join("\r\n", lines);
    }

    private static string DotStuff(string message)
    {
        var normalized = message.Replace("\r\n", "\n", StringComparison.Ordinal).Replace("\r", "\n", StringComparison.Ordinal);
        var lines = normalized.Split('\n');
        return string.Join("\r\n", lines.Select(line => line.StartsWith(".", StringComparison.Ordinal) ? $".{line}" : line));
    }

    private static string SanitizeOpenSslOutput(string output, string error)
    {
        var combined = $"{output}\n{error}".Trim();
        if (combined.Length <= 900)
        {
            return combined;
        }

        return combined[^900..];
    }

    private static string BuildBody(
        Case incident,
        Staff departmentLead,
        string escalationLevel,
        string reason,
        string performedBy)
    {
        return $"""
        MedLink Dashboard escalation notice

        Case: {incident.DisplayCode}
        Patient: {incident.PatientName}
        Department: {FormatDepartment(incident.Department.ToString())}
        Current priority: {incident.Severity}
        Current status: {incident.Status}
        Patient status: {incident.PatientStatus}
        Assigned staff: {incident.AssignedStaff?.Name ?? "Unassigned"}

        Escalation level: {escalationLevel}
        Reason: {reason}
        Requested by: {performedBy}

        Department lead: {departmentLead.Name}
        Lead phone: {departmentLead.PhoneNumber ?? "Not provided"}
        """;
    }

    private static string FormatDepartment(string value)
    {
        return value.Replace("CriticalCare", "Critical Care", StringComparison.Ordinal);
    }

    private sealed record SmtpReply(int Code, string Text);
}
