using HealthcareTriage.API.DTOs.Staff;
using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthcareTriage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Doctor,Nurse,Paramedic")]
public sealed class StaffController : ControllerBase
{
    private readonly HealthcareTriageDbContext _dbContext;

    public StaffController(HealthcareTriageDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<StaffResponse>>> GetStaff(
        CancellationToken cancellationToken)
    {
        var staff = await _dbContext.Staff
            .AsNoTracking()
            .Include(member => member.Zone)
            .OrderBy(member => member.Zone == null ? string.Empty : member.Zone.Name)
            .ThenBy(member => member.Name)
            .ToListAsync(cancellationToken);

        return Ok(staff.Select(ToStaffResponse).ToList());
    }

    [HttpPut("{staffId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<StaffResponse>> UpdateStaffProfile(
        Guid staffId,
        UpdateStaffProfileRequest request,
        CancellationToken cancellationToken)
    {
        var staffMember = await _dbContext.Staff
            .Include(member => member.Zone)
            .FirstOrDefaultAsync(member => member.Id == staffId, cancellationToken);

        if (staffMember is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Staff name is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Specialization))
        {
            return BadRequest(new { message = "Staff role or specialization is required." });
        }

        staffMember.Name = request.Name.Trim();
        staffMember.Specialization = request.Specialization.Trim();
        staffMember.EmailAddress = NormalizeOptionalText(request.EmailAddress);
        staffMember.PhoneNumber = NormalizeOptionalText(request.PhoneNumber);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToStaffResponse(staffMember));
    }

    private static StaffResponse ToStaffResponse(HealthcareTriage.Domain.Entities.Staff member)
    {
        return new StaffResponse(
            member.Id,
            member.Name,
            member.Specialization,
            member.Zone == null ? "Unassigned" : member.Zone.Name,
            member.IsOnDuty,
            member.IsBusy,
            member.CurrentCaseCount,
            member.CooldownUntil,
            member.TotalHoursWorked,
            member.EmailAddress,
            member.PhoneNumber,
            member.IsDepartmentLead,
            member.DepartmentLeadDepartment == null ? null : member.DepartmentLeadDepartment.ToString());
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
