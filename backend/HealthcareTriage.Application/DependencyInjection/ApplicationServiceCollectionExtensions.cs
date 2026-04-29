using HealthcareTriage.Application.Audit;
using HealthcareTriage.Application.Assignment;
using HealthcareTriage.Application.Compliance;
using HealthcareTriage.Application.Delegation;
using HealthcareTriage.Application.ETA;
using HealthcareTriage.Application.Fatigue;
using HealthcareTriage.Application.Resilience;
using Microsoft.Extensions.DependencyInjection;

namespace HealthcareTriage.Application.DependencyInjection;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(new ComplianceRules());
        services.AddScoped<IAuditService, NoOpAuditService>();
        services.AddScoped<IAssignmentService, AssignmentService>();
        services.AddScoped<IComplianceService, ComplianceService>();
        services.AddScoped<IDelegationService, DelegationService>();
        services.AddScoped<IETAService, ETAService>();
        services.AddScoped<IFatigueService, FatigueService>();
        services.AddScoped<IResilienceService, ResilienceService>();

        return services;
    }
}
