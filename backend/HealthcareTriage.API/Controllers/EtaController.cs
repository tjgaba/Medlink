using HealthcareTriage.API.DTOs.ETA;
using HealthcareTriage.Application.ETA;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthcareTriage.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Doctor,Nurse,Paramedic")]
public sealed class EtaController : ControllerBase
{
    private readonly IETAService _etaService;

    public EtaController(IETAService etaService)
    {
        _etaService = etaService;
    }

    [HttpPost("travel")]
    public ActionResult<EtaResponse> CalculateTravelEta(TravelEtaRequest request)
    {
        var baseMinutes = _etaService.CalculateTravelEtaMinutes(
            request.DistanceKm,
            request.AvgSpeedKmh);

        var adjustedMinutes = _etaService.ApplySeverityAdjustment(
            baseMinutes,
            request.Severity);

        return Ok(new EtaResponse(adjustedMinutes, _etaService.FormatEta(adjustedMinutes)));
    }
}
