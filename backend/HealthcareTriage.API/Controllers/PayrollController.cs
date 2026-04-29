using HealthcareTriage.API.DTOs.Payroll;
using HealthcareTriage.Application.Payroll;
using HealthcareTriage.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthcareTriage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public sealed class PayrollController : ControllerBase
{
    private readonly IPayrollTrackingService _payrollTrackingService;

    public PayrollController(IPayrollTrackingService payrollTrackingService)
    {
        _payrollTrackingService = payrollTrackingService;
    }

    [HttpPost("sessions/start")]
    public async Task<IActionResult> StartSession(
        StartWorkSessionRequest request,
        CancellationToken cancellationToken)
    {
        await _payrollTrackingService.StartSessionAsync(
            request.StaffId,
            request.ShiftStart,
            request.ScheduledHours,
            cancellationToken);

        return NoContent();
    }

    [HttpPost("sessions/end")]
    public async Task<IActionResult> EndSession(
        EndWorkSessionRequest request,
        CancellationToken cancellationToken)
    {
        await _payrollTrackingService.EndSessionAsync(
            request.StaffId,
            request.ShiftEnd,
            cancellationToken);

        return NoContent();
    }

    [HttpPost("events")]
    public async Task<IActionResult> LogEvent(
        LogWorkEventRequest request,
        CancellationToken cancellationToken)
    {
        await _payrollTrackingService.LogEventAsync(
            request.StaffId,
            request.EventType,
            request.RelatedCaseId,
            request.DurationMinutes,
            request.Notes,
            cancellationToken);

        return NoContent();
    }

    [HttpGet("staff/{staffId:guid}/sessions")]
    public async Task<ActionResult<IReadOnlyCollection<WorkSession>>> GetSessionsByStaff(
        Guid staffId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken cancellationToken)
    {
        var sessions = await _payrollTrackingService.GetSessionsByStaffAsync(
            staffId,
            from,
            to,
            cancellationToken);

        return Ok(sessions);
    }

    [HttpGet("cases/{caseId:guid}/events")]
    public async Task<ActionResult<IReadOnlyCollection<WorkEvent>>> GetEventsByCase(
        Guid caseId,
        CancellationToken cancellationToken)
    {
        var events = await _payrollTrackingService.GetEventsByCaseAsync(caseId, cancellationToken);
        return Ok(events);
    }

    [HttpGet("overtime")]
    public async Task<ActionResult<IReadOnlyCollection<PayrollOvertimeSummary>>> GetOvertime(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        var overtime = await _payrollTrackingService.GetOvertimeByStaffForMonthAsync(
            year,
            month,
            cancellationToken);

        return Ok(overtime);
    }
}
