using HealthcareTriage.Application.Authentication;
using HealthcareTriage.Application.Audit;
using HealthcareTriage.Application.Delegation;
using HealthcareTriage.Application.Payroll;
using HealthcareTriage.Infrastructure.Authentication;
using HealthcareTriage.Infrastructure.Audit;
using HealthcareTriage.Infrastructure.Delegation;
using HealthcareTriage.Infrastructure.Notifications;
using HealthcareTriage.Infrastructure.Payroll;
using HealthcareTriage.Infrastructure.Persistence;
using HealthcareTriage.Application.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HealthcareTriage.Infrastructure.DependencyInjection;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<HealthcareTriageDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IDelegationRepository, DelegationRepository>();
        services.AddScoped<IPayrollTrackingService, PayrollTrackingService>();
        var smtpSection = configuration.GetSection("Email:Smtp");
        services.Configure<SmtpEmailOptions>(options =>
        {
            options.Host = smtpSection["Host"] ?? options.Host;
            options.Port = int.TryParse(smtpSection["Port"], out var port) ? port : options.Port;
            options.EnableSsl = bool.TryParse(smtpSection["EnableSsl"], out var enableSsl) ? enableSsl : options.EnableSsl;
            options.Username = smtpSection["Username"] ?? options.Username;
            options.Password = smtpSection["Password"] ?? options.Password;
            options.FromAddress = smtpSection["FromAddress"] ?? options.FromAddress;
            options.FromName = smtpSection["FromName"] ?? options.FromName;
            options.OpenSslPath = smtpSection["OpenSslPath"] ?? options.OpenSslPath;
        });
        services.AddScoped<IEscalationEmailService, SmtpEscalationEmailService>();

        return services;
    }
}
