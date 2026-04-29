using HealthcareTriage.Application.Audit;

namespace HealthcareTriage.Application.Resilience;

public sealed class ResilienceService : IResilienceService
{
    private const int MaxAttempts = 3;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMilliseconds(150);

    private readonly IAuditService _auditService;

    public ResilienceService(IAuditService auditService)
    {
        _auditService = auditService;
    }

    public async Task ExecuteWithRetryAsync(
        Func<Task> action,
        CancellationToken cancellationToken = default)
    {
        await ExecuteWithRetryAsync(
            async () =>
            {
                await action();
                return true;
            },
            cancellationToken);
    }

    public async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> action,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(action);

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                return await action();
            }
            catch (Exception exception) when (attempt < MaxAttempts)
            {
                await LogFailureAsync("RetryAttempt", exception, attempt, cancellationToken);
                await Task.Delay(RetryDelay, cancellationToken);
            }
            catch (Exception exception)
            {
                await LogFailureAsync("RetryFailed", exception, attempt, cancellationToken);
                throw;
            }
        }

        throw new InvalidOperationException("Retry execution failed unexpectedly.");
    }

    public T ExecuteWithFallback<T>(Func<T> action, Func<T> fallback)
    {
        ArgumentNullException.ThrowIfNull(action);
        ArgumentNullException.ThrowIfNull(fallback);

        try
        {
            return action();
        }
        catch (Exception exception)
        {
            _ = LogFailureAsync("FallbackUsed", exception, 1, CancellationToken.None);
            return fallback();
        }
    }

    public async Task<T> ExecuteWithFallbackAsync<T>(
        Func<Task<T>> action,
        Func<T> fallback,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(action);
        ArgumentNullException.ThrowIfNull(fallback);

        try
        {
            return await action();
        }
        catch (Exception exception)
        {
            await LogFailureAsync("FallbackUsed", exception, 1, cancellationToken);
            return fallback();
        }
    }

    private async Task LogFailureAsync(
        string actionType,
        Exception exception,
        int attempt,
        CancellationToken cancellationToken)
    {
        try
        {
            var details = $$"""
            {
              "exceptionType": "{{exception.GetType().Name}}",
              "message": "{{EscapeJson(exception.Message)}}",
              "attempt": {{attempt}},
              "timestamp": "{{DateTime.UtcNow:O}}"
            }
            """;

            await _auditService.LogAsync(
                actionType,
                "Resilience",
                Guid.NewGuid().ToString(),
                "system",
                details,
                attempt >= MaxAttempts ? "Critical" : "Warning",
                cancellationToken);
        }
        catch
        {
            // Resilience logging must not cause the protected operation to fail.
        }
    }

    private static string EscapeJson(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal)
            .Replace("\r", "\\r", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal);
    }
}
