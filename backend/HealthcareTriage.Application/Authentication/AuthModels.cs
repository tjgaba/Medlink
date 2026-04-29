namespace HealthcareTriage.Application.Authentication;

public sealed record RegisterRequest(
    string Username,
    string Password,
    string Role);

public sealed record LoginRequest(
    string Username,
    string Password);

public sealed record AuthResponse(
    string Token,
    AuthUser User);

public sealed record AuthUser(
    Guid Id,
    string Username,
    string Role);
