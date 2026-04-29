namespace HealthcareTriage.API.DTOs.Errors;

public sealed record ErrorResponse(
    string Message,
    string? Detail,
    int StatusCode);
