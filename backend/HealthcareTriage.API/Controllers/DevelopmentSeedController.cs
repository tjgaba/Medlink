using HealthcareTriage.Domain.Entities;
using HealthcareTriage.Domain.Enums;
using HealthcareTriage.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HealthcareTriage.API.Controllers;

[ApiController]
[Route("api/dev/seed")]
[AllowAnonymous]
public sealed class DevelopmentSeedController : ControllerBase
{
    private static readonly Random Random = new(20260428);
    private const string DepartmentLeadEmail = "tjgaba777@gmail.com";
    private readonly HealthcareTriageDbContext _dbContext;
    private readonly IWebHostEnvironment _environment;

    public DevelopmentSeedController(
        HealthcareTriageDbContext dbContext,
        IWebHostEnvironment environment)
    {
        _dbContext = dbContext;
        _environment = environment;
    }

    [HttpPost("dashboard")]
    public async Task<IActionResult> SeedDashboard(CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
        {
            return NotFound();
        }

        try
        {
            await ResetOperationalData(cancellationToken);

            var zones = BuildZones();
            _dbContext.Zones.AddRange(zones.Values);
            await _dbContext.SaveChangesAsync(cancellationToken);

            LinkZones(zones);
            var staff = BuildStaff(zones);
            var patients = BuildPatients();
            var cases = BuildCases(patients, staff, zones, out var workEvents);

            UpdateStaffWorkload(staff, cases);

            _dbContext.Staff.AddRange(staff);
            _dbContext.Cases.AddRange(cases);
            _dbContext.WorkEvents.AddRange(workEvents);
            _dbContext.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActionType = "RealisticSeedLoaded",
                EntityType = "System",
                EntityId = "development-seed",
                PerformedBy = "system",
                Timestamp = DateTime.UtcNow,
                Details = JsonSerializer.Serialize(new
                {
                    source = "prompt16",
                    days = 30,
                    patients = patients.Count,
                    staff = staff.Count,
                    cases = cases.Count
                }),
                Severity = AuditSeverity.Info
            });

            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                message = "Realistic 30-day development data loaded.",
                patients = patients.Count,
                staff = staff.Count,
                cases = cases.Count
            });
        }
        catch (Exception exception)
        {
            return Problem(
                title: "Development seed failed.",
                detail: exception.GetBaseException().Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private async Task ResetOperationalData(CancellationToken cancellationToken)
    {
        await _dbContext.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE
                "DelegationAuditLogs",
                "DelegationRequests",
                "WorkEvents",
                "WorkSessions",
                "AuditLogs",
                "Cases",
                "Staff",
                "ZoneAdjacencies",
                "Zones"
            RESTART IDENTITY CASCADE;
            """,
            cancellationToken);
    }

    private static Dictionary<string, Zone> BuildZones()
    {
        var zoneNames = new[]
        {
            "Emergency Intake",
            "Triage Bay",
            "Trauma Bay",
            "Observation Area",
            "General Ward",
            "Pediatrics",
            "Radiology",
            "ICU",
            "Critical Care"
        };

        return zoneNames.ToDictionary(
            name => name,
            name => new Zone { Id = Guid.NewGuid(), Name = name });
    }

    private static void LinkZones(IReadOnlyDictionary<string, Zone> zones)
    {
        AddAdjacency(zones, "Emergency Intake", "Triage Bay");
        AddAdjacency(zones, "Triage Bay", "Observation Area");
        AddAdjacency(zones, "Triage Bay", "Trauma Bay");
        AddAdjacency(zones, "Trauma Bay", "Radiology");
        AddAdjacency(zones, "Trauma Bay", "ICU");
        AddAdjacency(zones, "Observation Area", "General Ward");
        AddAdjacency(zones, "Observation Area", "Pediatrics");
        AddAdjacency(zones, "ICU", "Critical Care");
    }

    private static void AddAdjacency(IReadOnlyDictionary<string, Zone> zones, string left, string right)
    {
        zones[left].AdjacentZones.Add(zones[right]);
        zones[right].AdjacentZones.Add(zones[left]);
    }

    private static List<Staff> BuildStaff(IReadOnlyDictionary<string, Zone> zones)
    {
        var definitions = new (string Name, string Specialization, string Zone)[]
        {
            ("Dr Amina Naidoo", "Emergency Medicine", "Trauma Bay"),
            ("Nurse Zanele Dlamini", "Critical Care", "ICU"),
            ("Dr Nadia Ebrahim", "Neurology", "ICU"),
            ("Nurse Thabo Mokoena", "Triage Nurse", "Triage Bay"),
            ("Dr Michael Jacobs", "Cardiology", "Emergency Intake"),
            ("Nurse Karen Botha", "Cardiology", "Observation Area"),
            ("Dr Sibusiso Dube", "Cardiology", "Emergency Intake"),
            ("Dr Priya Govender", "Emergency Medicine", "Trauma Bay"),
            ("Paramedic Wayne Adams", "Emergency Medicine", "Emergency Intake"),
            ("Nurse Themba Radebe", "Neurology", "Observation Area"),
            ("Dr Elena Maseko", "Neurology", "ICU"),
            ("Dr Farah Patel", "Critical Care", "Critical Care"),
            ("Nurse Johan Nel", "Critical Care", "ICU"),
            ("Dr Naledi Sithole", "General Practice", "General Ward"),
            ("Nurse Buhle Mkhize", "General Practice", "Observation Area"),
            ("Nurse Nandi Molefe", "Pediatrics", "Pediatrics"),
            ("Dr Yusuf Omar", "Pediatrics", "Pediatrics"),
            ("Radiographer Lunga Ndlovu", "Radiology", "Radiology"),
            ("Radiologist Melissa Singh", "Radiology", "Radiology"),
            ("Dr Refilwe Mokoena", "ICU", "ICU"),
            ("Nurse Anika Pillay", "ICU", "ICU"),
            ("Dr Lerato Khumalo", "General Practice", "General Ward"),
            ("Nurse Samkelo Mthembu", "Triage Nurse", "Triage Bay"),
            ("Dr Peter van Wyk", "Trauma", "Trauma Bay")
        };

        var staffMembers = definitions.Select((definition, index) => new Staff
        {
            Id = Guid.NewGuid(),
            Name = definition.Name,
            Specialization = definition.Specialization,
            ZoneId = zones[definition.Zone].Id,
            IsOnDuty = index % 11 != 0,
            IsBusy = false,
            CurrentCaseCount = 0,
            CooldownUntil = null,
            OptInOverride = index % 5 == 0,
            TotalHoursWorked = 20 + Random.Next(20, 95),
            LastShiftEndedAt = DateTimeOffset.UtcNow.AddHours(-Random.Next(8, 36))
        }).ToList();

        staffMembers.AddRange(BuildDepartmentLeads(zones));
        return staffMembers;
    }

    private static IEnumerable<Staff> BuildDepartmentLeads(IReadOnlyDictionary<string, Zone> zones)
    {
        var leadDefinitions = new (string Name, CaseDepartment Department, string PhoneNumber)[]
        {
            ("Dr Lindiwe Maseko", CaseDepartment.General, "+27 10 555 0101"),
            ("Dr Kian Pillay", CaseDepartment.Cardiology, "+27 10 555 0102"),
            ("Dr Amogelang Khumalo", CaseDepartment.Trauma, "+27 10 555 0103"),
            ("Dr Reneilwe Molefe", CaseDepartment.Neurology, "+27 10 555 0104"),
            ("Dr Yasmin Khan", CaseDepartment.Pediatrics, "+27 10 555 0105"),
            ("Dr Martin Botha", CaseDepartment.Radiology, "+27 10 555 0106"),
            ("Dr Sanele Mthembu", CaseDepartment.CriticalCare, "+27 10 555 0107"),
            ("Dr Nisha Reddy", CaseDepartment.ICU, "+27 10 555 0108")
        };

        return leadDefinitions.Select(definition =>
        {
            var departmentLabel = definition.Department.ToString().Replace("CriticalCare", "Critical Care");

            return new Staff
            {
                Id = Guid.NewGuid(),
                Name = definition.Name,
                Specialization = $"Department Lead - {departmentLabel}",
                ZoneId = ZoneForDepartment(zones, definition.Department).Id,
                IsOnDuty = true,
                IsBusy = false,
                CurrentCaseCount = 0,
                CooldownUntil = null,
                OptInOverride = true,
                TotalHoursWorked = 80,
                LastShiftEndedAt = DateTimeOffset.UtcNow.AddHours(-12),
                EmailAddress = DepartmentLeadEmail,
                PhoneNumber = definition.PhoneNumber,
                IsDepartmentLead = true,
                DepartmentLeadDepartment = definition.Department
            };
        });
    }

    private static List<SeedPatient> BuildPatients()
    {
        var firstNames = new[]
        {
            "Sipho", "Thandi", "Ayesha", "Johan", "Nomsa", "Peter", "Lindiwe", "Kabelo",
            "Fatima", "Daniel", "Grace", "Bongani", "Mia", "Sibusiso", "Lerato", "Nandi",
            "Yusuf", "Anika", "Refilwe", "Themba", "Naledi", "Priya", "Michael", "Sarah",
            "Zanele", "Wayne", "Melissa", "Lunga", "Buhle", "Farah"
        };
        var surnames = new[]
        {
            "Dlamini", "Khumalo", "Naidoo", "Mokoena", "Khan", "Jacobs", "Maseko", "Nkosi",
            "van der Merwe", "Molefe", "Hendricks", "Naicker", "Omar", "Pillay", "Botha",
            "Govender", "Radebe", "Ndlovu", "Sithole", "Patel"
        };
        var conditions = new[] { "", "Hypertension", "Diabetes", "Asthma", "Epilepsy", "HIV stable on ART", "Chronic kidney disease" };
        var allergies = new[] { "", "None", "Penicillin", "Sulfa drugs", "Aspirin", "Latex" };
        var medications = new[] { "", "Amlodipine", "Metformin", "Salbutamol inhaler", "Enalapril", "ARV regimen", "Warfarin" };

        return Enumerable.Range(0, 100).Select(index =>
        {
            var gender = index % 2 == 0 ? "Female" : "Male";
            var first = firstNames[(index * 7 + Random.Next(firstNames.Length)) % firstNames.Length];
            var surname = surnames[(index * 5 + Random.Next(surnames.Length)) % surnames.Length];
            var age = Random.Next(1, 91);

            return new SeedPatient(
                $"{first} {surname}",
                $"{Random.Next(50, 99):00}{Random.Next(100000, 999999)}{Random.Next(0, 9)}",
                age,
                gender,
                $"08{Random.Next(10, 99)}{Random.Next(100000, 999999)}",
                conditions[Random.Next(conditions.Length)],
                allergies[Random.Next(allergies.Length)],
                medications[Random.Next(medications.Length)]);
        }).ToList();
    }

    private static List<Case> BuildCases(
        IReadOnlyList<SeedPatient> patients,
        IReadOnlyList<Staff> staff,
        IReadOnlyDictionary<string, Zone> zones,
        out List<WorkEvent> workEvents)
    {
        workEvents = new List<WorkEvent>();
        var cases = new List<Case>();
        var now = DateTimeOffset.UtcNow;
        var caseNumber = 1;

        for (var day = 29; day >= 0; day--)
        {
            var date = now.Date.AddDays(-day);
            var weekdayBoost = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? -3 : 3;
            var spike = day is 4 or 11 or 22 ? Random.Next(5, 10) : 0;
            var dailyCount = Math.Clamp(9 + weekdayBoost + Random.Next(-3, 4) + spike, 5, 19);

            for (var dailyIndex = 0; dailyIndex < dailyCount; dailyIndex++)
            {
                var department = PickDepartment(dailyIndex, day);
                var pattern = PickPattern(department);
                var patient = PickPatient(patients, caseNumber);
                var createdAt = date.AddMinutes(PickMinuteOfDay(dailyIndex));
                var isRecent = createdAt > now.AddDays(-2);
                var severity = PickSeverity(department, pattern);
                var status = PickStatus(isRecent, severity);
                var assignedStaff = status == CaseStatus.Pending ? null : PickStaff(staff, department);
                var hasVitals = Random.NextDouble() > 0.14;
                var resolutionMinutes = PickResolutionMinutes(severity);

                var incident = new Case
                {
                    Id = Guid.NewGuid(),
                    DisplayCode = $"CASE-{caseNumber:000}",
                    PatientName = patient.FullName,
                    PatientIdNumber = patient.IdNumber,
                    Age = patient.Age,
                    Gender = patient.Gender,
                    NextOfKinName = BuildNextOfKinName(patient),
                    NextOfKinRelationship = patient.Age < 18 ? "Parent" : Random.Next(0, 2) == 0 ? "Spouse" : "Sibling",
                    NextOfKinPhone = patient.ContactNumber,
                    Severity = severity,
                    Department = department,
                    ZoneId = ZoneForDepartment(zones, department).Id,
                    Status = status,
                    PatientStatus = PatientStatusFor(status),
                    SymptomsSummary = pattern.Summary,
                    BloodPressure = hasVitals ? BuildBloodPressure(severity) : null,
                    HeartRate = hasVitals ? Random.Next(severity == CaseSeverity.Red ? 105 : 60, severity == CaseSeverity.Green ? 105 : 141) : null,
                    RespiratoryRate = hasVitals ? Random.Next(12, severity == CaseSeverity.Red ? 34 : 26) : null,
                    Temperature = hasVitals ? Math.Round((decimal)(36 + Random.NextDouble() * (department == CaseDepartment.Pediatrics ? 4.2 : 3.5)), 1) : null,
                    OxygenSaturation = hasVitals ? Random.Next(severity == CaseSeverity.Red ? 85 : 92, 101) : null,
                    ConsciousnessLevel = severity == CaseSeverity.Red && Random.NextDouble() > 0.5 ? "Confused" : "Alert",
                    ChronicConditions = patient.ChronicConditions,
                    CurrentMedications = patient.CurrentMedications,
                    Allergies = patient.Allergies,
                    MedicalAidScheme = Random.NextDouble() > 0.58 ? "Yes" : "No",
                    ParamedicNotes = pattern.Notes,
                    Prescription = status == CaseStatus.Completed ? BuildPrescription(department) : null,
                    CancellationReason = status == CaseStatus.Cancelled ? BuildCancellationReason(department) : null,
                    RequiredSpecialization = RequiredSpecializationFor(department),
                    AssignedStaffId = assignedStaff?.Id,
                    ETA = TimeSpan.FromMinutes(Random.Next(severity == CaseSeverity.Red ? 2 : 6, severity == CaseSeverity.Green ? 35 : 18)),
                    CreatedAt = createdAt
                };

                cases.Add(incident);
                if (assignedStaff is not null)
                {
                    workEvents.Add(new WorkEvent
                    {
                        Id = Guid.NewGuid(),
                        StaffId = assignedStaff.Id,
                        EventType = "CaseAssigned",
                        RelatedCaseId = incident.Id,
                        Timestamp = createdAt.AddMinutes(Random.Next(2, 14)),
                        Notes = $"{assignedStaff.Name} assigned to {incident.DisplayCode}."
                    });

                    if (status == CaseStatus.Completed)
                    {
                        workEvents.Add(new WorkEvent
                        {
                            Id = Guid.NewGuid(),
                            StaffId = assignedStaff.Id,
                            EventType = "CaseCompleted",
                            RelatedCaseId = incident.Id,
                            Timestamp = createdAt.AddMinutes(resolutionMinutes),
                            DurationMinutes = resolutionMinutes,
                            Notes = $"{incident.DisplayCode} completed after clinical review."
                        });
                    }
                }

                caseNumber++;
            }
        }

        return cases;
    }

    private static void UpdateStaffWorkload(IEnumerable<Staff> staff, IEnumerable<Case> cases)
    {
        foreach (var member in staff)
        {
            var activeCount = cases.Count(incident =>
                incident.AssignedStaffId == member.Id &&
                incident.Status is CaseStatus.Assigned or CaseStatus.InProgress);
            member.CurrentCaseCount = activeCount;
            member.IsBusy = activeCount >= 2;
            member.IsOnDuty = member.IsOnDuty || activeCount > 0;
        }
    }

    private static SeedPatient PickPatient(IReadOnlyList<SeedPatient> patients, int caseNumber)
    {
        if (caseNumber % 7 == 0)
        {
            return patients[Random.Next(0, 18)];
        }

        if (caseNumber % 11 == 0)
        {
            return patients[Random.Next(18, 35)];
        }

        return patients[Random.Next(patients.Count)];
    }

    private static int PickMinuteOfDay(int dailyIndex)
    {
        if (dailyIndex % 8 == 0)
        {
            return Random.Next(0, 360);
        }

        if (dailyIndex % 10 == 0)
        {
            return Random.Next(18 * 60, 24 * 60);
        }

        return Random.Next(8 * 60, 18 * 60);
    }

    private static CaseDepartment PickDepartment(int dailyIndex, int day)
    {
        var weighted = new[]
        {
            CaseDepartment.General, CaseDepartment.General, CaseDepartment.General,
            CaseDepartment.Trauma, CaseDepartment.Trauma,
            CaseDepartment.Cardiology, CaseDepartment.Cardiology,
            CaseDepartment.Pediatrics, CaseDepartment.Pediatrics,
            CaseDepartment.Neurology,
            CaseDepartment.Radiology,
            CaseDepartment.CriticalCare,
            CaseDepartment.ICU
        };

        if (day is 4 or 11 or 22 && dailyIndex % 3 == 0)
        {
            return CaseDepartment.Trauma;
        }

        return weighted[Random.Next(weighted.Length)];
    }

    private static ComplaintPattern PickPattern(CaseDepartment department)
    {
        var patterns = Patterns[department];
        return patterns[Random.Next(patterns.Length)];
    }

    private static CaseSeverity PickSeverity(CaseDepartment department, ComplaintPattern pattern)
    {
        if (pattern.IsCritical || department is CaseDepartment.ICU or CaseDepartment.CriticalCare)
        {
            return Random.NextDouble() > 0.35 ? CaseSeverity.Red : CaseSeverity.Orange;
        }

        return Random.NextDouble() switch
        {
            < 0.10 => CaseSeverity.Red,
            < 0.34 => CaseSeverity.Orange,
            < 0.76 => CaseSeverity.Yellow,
            _ => CaseSeverity.Green
        };
    }

    private static CaseStatus PickStatus(bool isRecent, CaseSeverity severity)
    {
        if (!isRecent)
        {
            return Random.NextDouble() > 0.07 ? CaseStatus.Completed : CaseStatus.Cancelled;
        }

        return Random.NextDouble() switch
        {
            < 0.16 => CaseStatus.Pending,
            < 0.52 => CaseStatus.Assigned,
            < 0.84 => CaseStatus.InProgress,
            _ => severity == CaseSeverity.Green ? CaseStatus.Completed : CaseStatus.Assigned
        };
    }

    private static Staff? PickStaff(IEnumerable<Staff> staff, CaseDepartment department)
    {
        var specialization = RequiredSpecializationFor(department);
        var eligible = staff
            .Where(member => member.Specialization == specialization ||
                (department == CaseDepartment.ICU && member.Specialization == "Critical Care") ||
                (department == CaseDepartment.Trauma && member.Specialization == "Emergency Medicine"))
            .OrderBy(_ => Random.Next())
            .ToList();

        return eligible.Count == 0 ? null : eligible[0];
    }

    private static Zone ZoneForDepartment(IReadOnlyDictionary<string, Zone> zones, CaseDepartment department)
    {
        return department switch
        {
            CaseDepartment.Trauma => zones["Trauma Bay"],
            CaseDepartment.Pediatrics => zones["Pediatrics"],
            CaseDepartment.Radiology => zones["Radiology"],
            CaseDepartment.ICU or CaseDepartment.CriticalCare or CaseDepartment.Neurology => zones["ICU"],
            CaseDepartment.General => zones["General Ward"],
            _ => zones["Emergency Intake"]
        };
    }

    private static string RequiredSpecializationFor(CaseDepartment department)
    {
        return department switch
        {
            CaseDepartment.Cardiology => "Cardiology",
            CaseDepartment.Trauma => "Emergency Medicine",
            CaseDepartment.Neurology => "Neurology",
            CaseDepartment.Pediatrics => "Pediatrics",
            CaseDepartment.Radiology => "Radiology",
            CaseDepartment.CriticalCare => "Critical Care",
            CaseDepartment.ICU => "ICU",
            _ => "General Practice"
        };
    }

    private static string PatientStatusFor(CaseStatus status)
    {
        return status switch
        {
            CaseStatus.Pending => Random.NextDouble() > 0.5 ? "Waiting" : "Arrived",
            CaseStatus.Assigned => "Arrived",
            CaseStatus.InProgress => "Under Treatment",
            CaseStatus.Completed => "Transferred",
            _ => "Waiting"
        };
    }

    private static string BuildBloodPressure(CaseSeverity severity)
    {
        var systolic = Random.Next(severity == CaseSeverity.Red ? 88 : 108, severity == CaseSeverity.Red ? 182 : 150);
        var diastolic = Random.Next(58, 98);
        return $"{systolic}/{diastolic}";
    }

    private static int PickResolutionMinutes(CaseSeverity severity)
    {
        return severity switch
        {
            CaseSeverity.Red => Random.Next(18, 70),
            CaseSeverity.Orange => Random.Next(28, 100),
            CaseSeverity.Yellow => Random.Next(45, 150),
            _ => Random.Next(25, 110)
        };
    }

    private static string BuildPrescription(CaseDepartment department)
    {
        return department switch
        {
            CaseDepartment.Cardiology => "Aspirin administered where appropriate; blood pressure controlled; cardiology follow-up arranged.",
            CaseDepartment.Trauma => "Wound care or immobilisation completed; analgesia prescribed; imaging/surgical follow-up advised if needed.",
            CaseDepartment.Pediatrics => "Fever or respiratory symptoms treated; caregiver given hydration, medication, and return-warning advice.",
            CaseDepartment.Neurology => "Neurological pathway completed; anti-seizure or stroke follow-up plan documented where indicated.",
            CaseDepartment.CriticalCare => "Stabilisation completed; antibiotics/oxygen support plan documented; critical-care follow-up arranged.",
            CaseDepartment.ICU => "ICU management plan completed; oxygen/monitoring and consultant follow-up documented.",
            CaseDepartment.Radiology => "Imaging reviewed; results communicated; treatment or follow-up plan documented.",
            _ => "Symptomatic treatment completed; discharge advice and follow-up instructions provided."
        };
    }

    private static string BuildCancellationReason(CaseDepartment department)
    {
        return department switch
        {
            CaseDepartment.Trauma => "Patient redirected to trauma referral pathway before local treatment was completed.",
            CaseDepartment.Radiology => "Imaging request cancelled after clinician review showed no immediate radiology need.",
            CaseDepartment.Pediatrics => "Caregiver withdrew before full assessment; return-warning advice documented.",
            _ => "Cancelled before clinical completion; no treatment plan was issued."
        };
    }

    private static string BuildNextOfKinName(SeedPatient patient)
    {
        var firstNames = new[] { "Sarah", "Thabo", "Lerato", "Johan", "Nomsa", "Ayesha", "Bongani", "Grace" };
        var surname = patient.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? "Family";
        return $"{firstNames[Random.Next(firstNames.Length)]} {surname}";
    }

    private static readonly Dictionary<CaseDepartment, ComplaintPattern[]> Patterns = new()
    {
        [CaseDepartment.Cardiology] =
        [
            new("Chest pain with sweating and shortness of breath.", "ECG requested; aspirin history checked.", true),
            new("Hypertension with severe headache and dizziness.", "Repeat blood pressure after rest."),
            new("Palpitations and near-syncope while walking.", "Telemetry observation requested.")
        ],
        [CaseDepartment.Trauma] =
        [
            new("Motor vehicle collision with limb pain and abrasions.", "Spine precautions maintained.", true),
            new("Fall with suspected wrist fracture and swelling.", "X-ray referral prepared."),
            new("Laceration requiring sutures; bleeding controlled.", "Tetanus status checked.")
        ],
        [CaseDepartment.Pediatrics] =
        [
            new("Child with fever, cough and poor feeding.", "Caregiver counselled on hydration."),
            new("Persistent wheeze with moderate respiratory distress.", "Nebulisation response monitored.", true),
            new("Vomiting and diarrhoea with dehydration risk.", "Oral rehydration started.")
        ],
        [CaseDepartment.Neurology] =
        [
            new("Sudden weakness on one side with slurred speech.", "Stroke pathway activated.", true),
            new("Confusion after possible seizure episode.", "Neurological observations started."),
            new("Severe headache with visual disturbance.", "Escalated for medical review.")
        ],
        [CaseDepartment.CriticalCare] =
        [
            new("Sepsis risk with fever, confusion and low oxygen saturation.", "Broad-spectrum escalation prepared.", true),
            new("Respiratory distress requiring close monitoring.", "Oxygen therapy commenced.", true)
        ],
        [CaseDepartment.ICU] =
        [
            new("Post-operative instability with rising respiratory effort.", "ICU transfer accepted.", true),
            new("Low oxygen saturation despite supplemental oxygen.", "Critical care review requested.", true)
        ],
        [CaseDepartment.Radiology] =
        [
            new("Possible fracture requiring imaging review.", "Radiology slot requested."),
            new("Chest x-ray review for persistent cough.", "Image request linked to triage record.")
        ],
        [CaseDepartment.General] =
        [
            new("Medication refill and stable chronic disease review.", "Routine observations recorded."),
            new("Gastroenteritis with mild dehydration.", "Fluids and observation advised."),
            new("Dizziness and fatigue without focal symptoms.", "General clinical review queued.")
        ]
    };

    private sealed record SeedPatient(
        string FullName,
        string IdNumber,
        int Age,
        string Gender,
        string ContactNumber,
        string ChronicConditions,
        string Allergies,
        string CurrentMedications);

    private sealed record ComplaintPattern(string Summary, string Notes, bool IsCritical = false);
}
