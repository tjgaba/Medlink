using HealthcareTriage.API.DTOs.Errors;

namespace HealthcareTriage.API.Middleware;

public sealed class StatusCodeResponseMiddleware
{
    private readonly RequestDelegate _next;

    public StatusCodeResponseMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        if (context.Response.HasStarted ||
            context.Response.ContentLength.HasValue ||
            !ShouldWriteError(context.Response.StatusCode))
        {
            return;
        }

        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new ErrorResponse(
            GetMessage(context.Response.StatusCode),
            null,
            context.Response.StatusCode));
    }

    private static bool ShouldWriteError(int statusCode)
    {
        return statusCode is StatusCodes.Status400BadRequest
            or StatusCodes.Status401Unauthorized
            or StatusCodes.Status403Forbidden
            or StatusCodes.Status404NotFound;
    }

    private static string GetMessage(int statusCode)
    {
        return statusCode switch
        {
            StatusCodes.Status400BadRequest => "The request could not be processed.",
            StatusCodes.Status401Unauthorized => "Authentication is required.",
            StatusCodes.Status403Forbidden => "You do not have permission to perform this action.",
            StatusCodes.Status404NotFound => "The requested resource was not found.",
            _ => "An error occurred."
        };
    }
}
