export function getCaseId(incident) {
  return incident.id ?? incident.caseId ?? "Unknown";
}

export function getCaseDisplayCode(incident) {
  return incident.displayCode ?? incident.caseCode ?? incident.caseNumber ?? getCaseId(incident);
}

export function getPatientName(incident) {
  return incident.patientName ?? incident.patient?.name ?? "Patient name pending";
}

export function getDepartment(incident) {
  return incident.department ?? "General";
}

export function getSymptomsSummary(incident) {
  return incident.symptomsSummary ?? incident.symptoms ?? "Symptoms pending review";
}

export function getPrescription(incident) {
  return incident.prescription ?? incident.prescriptionNotes ?? incident.treatmentPlan ?? "";
}

export function getCancellationReason(incident) {
  return incident.cancellationReason ?? incident.cancelReason ?? incident.cancellationNotes ?? "";
}

export function getZoneName(incident) {
  return incident?.zone?.name ?? incident?.zoneName ?? incident?.zone ?? "Unassigned";
}

export function getAssignedStaffName(incident) {
  return incident.assignedStaff?.name ?? incident.assignedStaffName ?? "Unassigned";
}

export function getPatientStatus(incident) {
  return incident.patientStatus ?? incident.patient?.status ?? "Arrived";
}

export function formatEta(eta) {
  if (!eta) {
    return "ETA: pending";
  }

  if (typeof eta === "number") {
    return `ETA: ~${eta} min`;
  }

  if (typeof eta === "string") {
    const timeParts = eta.split(":").map(Number);

    if (timeParts.length >= 2 && timeParts.every((part) => Number.isFinite(part))) {
      const minutes = timeParts.length === 3 ? timeParts[0] * 60 + timeParts[1] : timeParts[0];
      return `ETA: ~${Math.max(1, minutes)} min`;
    }

    return eta.startsWith("ETA") ? eta : `ETA: ${eta}`;
  }

  return "ETA: pending";
}

export function normalizeSeverity(severity) {
  return String(severity ?? "Green").toUpperCase();
}

export function formatSeverityLabel(severity) {
  const labels = {
    RED: "High",
    ORANGE: "Medium",
    YELLOW: "Low",
    GREEN: "Minimal"
  };

  return labels[normalizeSeverity(severity)] ?? normalizeSeverity(severity);
}

export function formatDepartment(department) {
  return String(department ?? "General")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}
