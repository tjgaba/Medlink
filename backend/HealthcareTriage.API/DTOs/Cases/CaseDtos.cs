namespace HealthcareTriage.API.DTOs.Cases;

public sealed record CreateCaseRequest(
    string PatientName,
    string? PatientIdNumber,
    int? Age,
    string? Gender,
    string? Address,
    string? NextOfKinName,
    string? NextOfKinRelationship,
    string? NextOfKinPhone,
    string Severity,
    string Department,
    string SymptomsSummary,
    Guid? ZoneId,
    string? ZoneName,
    string? Status,
    string? PatientStatus,
    string? BloodPressure,
    int? HeartRate,
    int? RespiratoryRate,
    decimal? Temperature,
    int? OxygenSaturation,
    string? ConsciousnessLevel,
    string? ChronicConditions,
    string? CurrentMedications,
    string? Allergies,
    string? MedicalAidScheme,
    string? ParamedicNotes,
    string? Prescription,
    string? CancellationReason,
    string? RequiredSpecialization,
    int? EtaMinutes,
    string? DisplayCode);

public sealed record UpdatePatientProfileRequest(
    string PatientName,
    string? PatientIdNumber,
    int? Age,
    string? Gender,
    string? Address,
    string? NextOfKinName,
    string? NextOfKinRelationship,
    string? NextOfKinPhone,
    string? BloodPressure,
    int? HeartRate,
    int? RespiratoryRate,
    decimal? Temperature,
    int? OxygenSaturation,
    string? ConsciousnessLevel,
    string? ChronicConditions,
    string? CurrentMedications,
    string? Allergies,
    string? MedicalAidScheme,
    string? ParamedicNotes,
    string? Prescription,
    string? CancellationReason,
    string Severity,
    string Department,
    string? RequiredSpecialization,
    string? PatientStatus,
    string Status);

public sealed record AssignCaseRequest(
    Guid StaffId,
    string? Notes);

public sealed record EscalateCaseRequest(
    string Level,
    string Reason,
    bool NotifyDepartmentLead);

public sealed record EscalateCaseResponse(
    DashboardCaseResponse Case,
    string? NotificationWarning);

public sealed record CompleteCaseRequest(
    string? Notes,
    string? Prescription);

public sealed record CancelCaseRequest(
    string? Notes);

public sealed record DashboardCaseResponse(
    Guid Id,
    string DisplayCode,
    string PatientName,
    string? PatientIdNumber,
    int? Age,
    string? Gender,
    string? Address,
    string? NextOfKinName,
    string? NextOfKinRelationship,
    string? NextOfKinPhone,
    string Severity,
    string Department,
    string SymptomsSummary,
    string? RequiredSpecialization,
    string Zone,
    TimeSpan? ETA,
    Guid? AssignedStaffId,
    string? AssignedStaffName,
    string Status,
    string PatientStatus,
    string? BloodPressure,
    int? HeartRate,
    int? RespiratoryRate,
    decimal? Temperature,
    int? OxygenSaturation,
    string? ConsciousnessLevel,
    string? ChronicConditions,
    string? CurrentMedications,
    string? Allergies,
    string? MedicalAidScheme,
    string? ParamedicNotes,
    string? Prescription,
    string? CancellationReason,
    DateTimeOffset CreatedAt,
    Guid? PendingDelegationId);
