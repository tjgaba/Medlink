namespace HealthcareTriage.Application.Resilience;

public interface IResilienceService
{
    Task ExecuteWithRetryAsync(
        Func<Task> action,
        CancellationToken cancellationToken = default);

    Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> action,
        CancellationToken cancellationToken = default);

    T ExecuteWithFallback<T>(
        Func<T> action,
        Func<T> fallback);

    Task<T> ExecuteWithFallbackAsync<T>(
        Func<Task<T>> action,
        Func<T> fallback,
        CancellationToken cancellationToken = default);
}
