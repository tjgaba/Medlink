using HealthcareTriage.API.DTOs.Errors;
using HealthcareTriage.Application.Audit;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;

namespace HealthcareTriage.API.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(RequestDelegate next, IHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = MapStatusCode(exception);
        var message = MapMessage(statusCode);
        var detail = _environment.IsDevelopment()
            ? exception.GetBaseException().Message
            : null;

        await LogExceptionAsync(context, exception, statusCode);

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        await context.Response.WriteAsJsonAsync(new ErrorResponse(
            message,
            detail,
            statusCode));
    }

    private async Task LogExceptionAsync(HttpContext context, Exception exception, int statusCode)
    {
        try
        {
            var auditService = context.RequestServices.GetRequiredService<IAuditService>();
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
            var details = $$"""
            {
              "exceptionType": "{{exception.GetType().Name}}",
              "message": "{{EscapeJson(exception.Message)}}",
              "path": "{{EscapeJson(context.Request.Path)}}",
              "method": "{{context.Request.Method}}",
              "statusCode": {{statusCode}},
              "timestamp": "{{DateTime.UtcNow:O}}"
            }
            """;

            await auditService.LogAsync(
                "UnhandledException",
                "HttpRequest",
                context.TraceIdentifier,
                userId,
                details,
                statusCode >= 500 ? "Critical" : "Warning",
                context.RequestAborted);
        }
        catch
        {
            // Exception handling must never fail because audit logging failed.
        }
    }

    private static int MapStatusCode(Exception exception)
    {
        return exception switch
        {
            ArgumentException => StatusCodes.Status400BadRequest,
            InvalidOperationException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            BadHttpRequestException => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError
        };
    }

    private static string MapMessage(int statusCode)
    {
        return statusCode switch
        {
            (int)HttpStatusCode.BadRequest => "The request could not be processed.",
            (int)HttpStatusCode.Unauthorized => "Authentication is required.",
            (int)HttpStatusCode.Forbidden => "You do not have permission to perform this action.",
            (int)HttpStatusCode.NotFound => "The requested resource was not found.",
            _ => "An unexpected error occurred."
        };
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
