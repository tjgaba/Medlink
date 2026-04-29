using HealthcareTriage.API.DTOs.Delegation;
using HealthcareTriage.Application.Delegation;
using HealthcareTriage.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthcareTriage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Doctor,Nurse,Paramedic")]
public sealed class DelegationController : ControllerBase
{
    private readonly IDelegationService _delegationService;

    public DelegationController(IDelegationService delegationService)
    {
        _delegationService = delegationService;
    }

    [HttpPost]
    public async Task<ActionResult<DelegationRequest>> Create(
        CreateDelegationRequest request,
        CancellationToken cancellationToken)
    {
        DelegationRequest delegationRequest;

        try
        {
            delegationRequest = await _delegationService.CreateDelegationRequestAsync(
                request.FromStaffId,
                request.ToStaffId,
                request.CaseId,
                request.Type,
                request.Reason,
                cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        return CreatedAtAction(nameof(Create), new { id = delegationRequest.Id }, delegationRequest);
    }

    [HttpPost("{requestId:guid}/accept")]
    public async Task<IActionResult> Accept(Guid requestId, CancellationToken cancellationToken)
    {
        await _delegationService.AcceptDelegationAsync(requestId, cancellationToken);
        return NoContent();
    }

    [HttpPost("{requestId:guid}/decline")]
    public async Task<IActionResult> Decline(Guid requestId, CancellationToken cancellationToken)
    {
        await _delegationService.DeclineDelegationAsync(requestId, cancellationToken);
        return NoContent();
    }
}
