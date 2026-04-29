using HealthcareTriage.Domain.Enums;

namespace HealthcareTriage.Domain.Entities;

public sealed class Case
{
    public Guid Id { get; set; }
    public string DisplayCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PatientIdNumber { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? NextOfKinName { get; set; }
    public string? NextOfKinRelationship { get; set; }
    public string? NextOfKinPhone { get; set; }
    public CaseSeverity Severity { get; set; }
    public CaseDepartment Department { get; set; }
    public Guid ZoneId { get; set; }
    public Zone? Zone { get; set; }
    public CaseStatus Status { get; set; }
    public string PatientStatus { get; set; } = "Arrived";
    public string SymptomsSummary { get; set; } = string.Empty;
    public string? BloodPressure { get; set; }
    public int? HeartRate { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? Temperature { get; set; }
    public int? OxygenSaturation { get; set; }
    public string? ConsciousnessLevel { get; set; }
    public string? ChronicConditions { get; set; }
    public string? CurrentMedications { get; set; }
    public string? Allergies { get; set; }
    public string? MedicalAidScheme { get; set; }
    public string? ParamedicNotes { get; set; }
    public string? Prescription { get; set; }
    public string? CancellationReason { get; set; }
    public string? RequiredSpecialization { get; set; }
    public Guid? AssignedStaffId { get; set; }
    public Staff? AssignedStaff { get; set; }
    public TimeSpan? ETA { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<DelegationRequest> DelegationRequests { get; set; } = new List<DelegationRequest>();
}
