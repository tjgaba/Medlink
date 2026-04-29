import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useCases } from "../hooks/useCases.js";
import {
  assignCase,
  cancelCase,
  completeCase,
  createCase,
  escalateCase,
  getStaff,
  requestDelegation,
  unassignCase,
  updateCasePatientProfile,
  updateStaffProfile
} from "../services/casesService.js";
import {
  formatDepartment,
  formatEta,
  formatSeverityLabel,
  getAssignedStaffName,
  getCancellationReason,
  getCaseDisplayCode,
  getCaseId,
  getDepartment,
  getPatientStatus,
  getPatientName,
  getPrescription,
  getSymptomsSummary,
  getZoneName,
  normalizeSeverity
} from "../utils/caseFormatters.js";

const railItems = [
  { id: "dashboard", label: "Dashboard", description: "Dashboard snapshots and active alerts" },
  { id: "assignment", label: "Cases", description: "Main case workflow and staff assignment queue" },
  { id: "patients", label: "Patients", description: "Patient records, profiles, and triage details" },
  { id: "staff", label: "Staff", description: "Staff profiles and capacity" },
  { id: "analytics", label: "Insights", description: "Clinic performance, workload, and AI signals" }
];

const cascadeFilterTypes = [
  { id: "any", label: "Dashboard" },
  { id: "severity", label: "Priority" },
  { id: "department", label: "Department" },
  { id: "staff", label: "Staff member" },
  { id: "status", label: "Case status" }
];

const smartSetOptions = [
  { value: "all", label: "All cases" },
  { value: "priority", label: "High priority" },
  { value: "assigned", label: "Assigned" },
  { value: "unassigned", label: "Unassigned" },
  { value: "delegated", label: "Delegation active" }
];

const statusFilterOptions = [
  { id: "ALL", label: "All cases", countKey: "all", className: "severity-chip-neutral" },
  { id: "Pending", label: "Pending", countKey: "pending", className: "status-chip-pending" },
  { id: "Assigned", label: "Assigned", countKey: "assigned", className: "status-chip-assigned" },
  { id: "InProgress", label: "InProgress", countKey: "inprogress", className: "status-chip-progress" },
  { id: "Completed", label: "Completed", countKey: "completed", className: "status-chip-completed" },
  { id: "Cancelled", label: "Canceled", countKey: "cancelled", className: "status-chip-cancelled" },
  { id: "PendingDelegations", label: "Pending Delegations", countKey: "pendingDelegations", className: "status-chip-delegation" }
];

const zoneCoordinates = {
  "Emergency Intake": { x: 18, y: 44 },
  "Waiting Area": { x: 26, y: 50 },
  "Triage Bay": { x: 36, y: 45 },
  "Trauma Bay": { x: 55, y: 38 },
  "Observation Area": { x: 43, y: 60 },
  "General Ward": { x: 58, y: 68 },
  "Isolation Ward": { x: 72, y: 58 },
  "Short Stay Unit": { x: 52, y: 62 },
  ICU: { x: 67, y: 28 },
  "Operating Theatre": { x: 75, y: 40 },
  Radiology: { x: 36, y: 70 },
  Laboratory: { x: 48, y: 74 },
  Pharmacy: { x: 78, y: 70 },
  "Recovery Room": { x: 66, y: 76 },
  Discharge: { x: 86, y: 78 },
  Unassigned: { x: 50, y: 50 }
};

const clinicDepartments = [
  { id: "General", label: "General", className: "zone-general" },
  { id: "Cardiology", label: "Cardiology", className: "zone-cardiology" },
  { id: "Trauma", label: "Trauma", className: "zone-trauma" },
  { id: "Neurology", label: "Neurology", className: "zone-neurology" },
  { id: "Pediatrics", label: "Pediatrics", className: "zone-pediatrics" },
  { id: "Radiology", label: "Radiology", className: "zone-radiology" },
  { id: "Critical Care", label: "Critical Care", className: "zone-critical" },
  { id: "ICU", label: "ICU", className: "zone-icu" }
];

const departmentStaffSpecializations = {
  General: ["General", "General Practice", "Triage Nurse"],
  Cardiology: ["Cardiology"],
  Trauma: ["Trauma", "Emergency Medicine"],
  Neurology: ["Neurology"],
  Pediatrics: ["Pediatrics"],
  Radiology: ["Radiology"],
  "Critical Care": ["Critical Care"],
  ICU: ["ICU", "Critical Care"]
};

const delegationTypeOptions = [
  { value: "Short", label: "Short cover" },
  { value: "Long/Shift Cover(remainder)", label: "Long/Shift Cover(remainder)" }
];

const caseSeverityOptions = ["Green", "Yellow", "Orange", "Red"];

const clinicZoneOptions = [
  "Emergency Intake",
  "Waiting Area",
  "Triage Bay",
  "Trauma Bay",
  "Observation Area",
  "General Ward",
  "Isolation Ward",
  "Short Stay Unit",
  "ICU",
  "Operating Theatre",
  "Radiology",
  "Laboratory",
  "Pharmacy",
  "Recovery Room",
  "Discharge"
];

const patientStatusOptions = [
  "On Transit",
  "Arrived",
  "Waiting",
  "Under Treatment",
  "Transferred"
];

const patientStatusToCaseStatus = {
  "On Transit": "Pending",
  Arrived: "Pending",
  Waiting: "Pending",
  "Under Treatment": "InProgress",
  Transferred: "Assigned"
};

const caseRecordStatusOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" }
];

const caseRecordSortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "patient", label: "Patient" },
  { value: "department", label: "Department" }
];

const patientGenderOptions = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" }
];

const staffRoleOptions = [
  { value: "all", label: "All" },
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" }
];

const staffStatusOptions = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" }
];

const insightDateRangeOptions = [
  { value: "24h", label: "Last 24h", days: 1 },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 }
];

const defaultNewCaseForm = {
  patientName: "",
  severity: "Yellow",
  department: "General",
  symptomsSummary: "",
  zoneName: "Emergency Intake",
  patientStatus: "Arrived",
  requiredSpecialization: "",
  etaMinutes: "15",
  displayCode: ""
};

const defaultPatientProfileForm = {
  patientName: "",
  patientIdNumber: "",
  age: "",
  gender: "",
  address: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  bloodPressure: "",
  heartRate: "",
  respiratoryRate: "",
  temperature: "",
  oxygenSaturation: "",
  consciousnessLevel: "",
  chronicConditions: "",
  currentMedications: "",
  allergies: "",
  medicalAidScheme: "",
  paramedicNotes: "",
  prescription: "",
  cancellationReason: "",
  severity: "Yellow",
  department: "General",
  patientStatus: "Arrived",
  status: "Pending"
};

const defaultPatientDirectoryEditForm = {
  patientName: "",
  patientIdNumber: "",
  age: "",
  gender: "",
  address: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: ""
};

const defaultStaffProfileForm = {
  name: "",
  specialization: "",
  emailAddress: "",
  phoneNumber: ""
};

function matchesRailFilter(incident, activeRail) {
  const severity = normalizeSeverity(incident.severity);
  const status = String(incident.status ?? "").toLowerCase();
  const hasDelegation = Boolean(incident.pendingDelegationId ?? incident.delegationRequestId);
  const hasAssignedStaff = Boolean(incident.assignedStaffName ?? incident.assignedStaff);

  if (activeRail === "triage") {
    return severity === "RED" || severity === "ORANGE";
  }

  if (activeRail === "assignment") {
    return true;
  }

  if (activeRail === "delegation") {
    return hasDelegation || status.includes("delegat") || status.includes("assigned");
  }

  return true;
}

function showNotice(message, type = "info") {
  window.dispatchEvent(new CustomEvent("app:notice", { detail: { message, type } }));
}

function getFilterValue(incident, filterType) {
  if (filterType === "severity") {
    return normalizeSeverity(incident.severity);
  }

  if (filterType === "department") {
    return formatDepartment(getDepartment(incident));
  }

  if (filterType === "staff") {
    return getAssignedStaffName(incident);
  }

  if (filterType === "status") {
    return incident.status ?? "Pending";
  }

  return "All cases";
}

function getUniqueOptions(incidents, filterType) {
  return [...new Set(incidents.map((incident) => getFilterValue(incident, filterType)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: formatFilterOptionLabel(value, filterType) }));
}

function formatFilterOptionLabel(value, filterType) {
  if (filterType === "severity") {
    return formatSeverityLabel(value);
  }

  if (filterType === "status") {
    return String(value).replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  return value;
}

function getRefinementType(filterType) {
  if (filterType === "severity") {
    return "department";
  }

  if (filterType === "department") {
    return "severity";
  }

  if (filterType === "staff") {
    return "status";
  }

  if (filterType === "status" || filterType === "any") {
    return "department";
  }

  return "";
}

function matchesSmartSet(incident, filterValue) {
  const severity = normalizeSeverity(incident.severity);
  const status = String(incident.status ?? "").toLowerCase();
  const hasDelegation = Boolean(incident.pendingDelegationId ?? incident.delegationRequestId);
  const hasAssignedStaff = Boolean(incident.assignedStaffName ?? incident.assignedStaff);

  if (filterValue === "priority") {
    return severity === "RED" || severity === "ORANGE";
  }

  if (filterValue === "assigned") {
    return hasAssignedStaff;
  }

  if (filterValue === "unassigned") {
    return !hasAssignedStaff || status.includes("pending");
  }

  if (filterValue === "delegated") {
    return hasDelegation || status.includes("delegat");
  }

  return true;
}

function getZoneCoordinates(zoneName) {
  return zoneCoordinates[zoneName] ?? zoneCoordinates.Unassigned;
}

function getEtaMinutes(eta) {
  if (!eta) {
    return null;
  }

  if (typeof eta === "number") {
    return eta;
  }

  if (typeof eta === "string") {
    const timeParts = eta.split(":").map(Number);
    if (timeParts.length >= 2 && timeParts.every((part) => Number.isFinite(part))) {
      return timeParts.length === 3 ? timeParts[0] * 60 + timeParts[1] : timeParts[0];
    }

    const match = eta.match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  return null;
}

function getRequiredSpecialization(incident) {
  return incident?.requiredSpecialization ?? "";
}

function matchesCaseDepartmentStaff(member, incident) {
  const requiredSpecialization = getRequiredSpecialization(incident);
  const selectedDepartment = formatDepartment(getDepartment(incident ?? {}));
  const departmentSpecializations = departmentStaffSpecializations[selectedDepartment] ?? [selectedDepartment];

  return requiredSpecialization
    ? member.specialization === requiredSpecialization
    : departmentSpecializations.includes(member.specialization);
}

function sortStaffByAvailability(left, right) {
  const leftAvailable = left.isOnDuty && !left.isBusy ? 0 : 1;
  const rightAvailable = right.isOnDuty && !right.isBusy ? 0 : 1;
  if (leftAvailable !== rightAvailable) {
    return leftAvailable - rightAvailable;
  }
  if (left.currentCaseCount !== right.currentCaseCount) {
    return left.currentCaseCount - right.currentCaseCount;
  }
  return left.name.localeCompare(right.name);
}

function isDelegationTargetEligible(member, incident) {
  if (!member || !incident) {
    return false;
  }

  return matchesCaseDepartmentStaff(member, incident) &&
    member.isOnDuty &&
    !member.isBusy &&
    member.zone === getZoneName(incident);
}

function normalizeStatus(status) {
  return String(status ?? "Pending").replace(/\s/g, "").toLowerCase();
}

function isCancelledStatus(status) {
  return ["cancelled", "canceled"].includes(normalizeStatus(status));
}

function isClosedCase(incident) {
  return normalizeStatus(incident?.status) === "completed" || isCancelledStatus(incident?.status);
}

function shouldShowPrescription(incident) {
  return normalizeStatus(incident?.status) === "completed";
}

function shouldShowCancellationReason(incident) {
  return isCancelledStatus(incident?.status);
}

function getProfileValue(value, fallback = "Not captured") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function extractVitalFromSummary(incident, pattern) {
  const summary = getSymptomsSummary(incident);
  const match = summary.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function getVitalValue(incident, field, fallbackPattern, suffix = "") {
  const directValue = incident?.[field];
  const parsedValue = extractVitalFromSummary(incident, fallbackPattern);
  const value = getProfileValue(directValue, parsedValue || "Not captured");
  return value === "Not captured" || suffix === "" ? value : `${value}${suffix}`;
}

function getEditableVitalValue(incident, field, fallbackPattern) {
  const directValue = incident?.[field];
  if (directValue !== null && directValue !== undefined && directValue !== "") {
    return String(directValue);
  }

  return extractVitalFromSummary(incident, fallbackPattern);
}

function buildPatientProfileForm(incident) {
  if (!incident) {
    return defaultPatientProfileForm;
  }

  // Normalize nullable API fields into controlled form values.
  return {
    patientName: getPatientName(incident) === "Unknown patient" ? "" : getPatientName(incident),
    patientIdNumber: incident.patientIdNumber ?? incident.idNumber ?? "",
    age: incident.age?.toString() ?? "",
    gender: incident.gender ?? "",
    address: incident.address ?? "",
    nextOfKinName: incident.nextOfKinName ?? "",
    nextOfKinRelationship: incident.nextOfKinRelationship ?? "",
    nextOfKinPhone: incident.nextOfKinPhone ?? "",
    bloodPressure: getEditableVitalValue(incident, "bloodPressure", /BP\s+([^;.]+)/i),
    heartRate: getEditableVitalValue(incident, "heartRate", /HR\s+(\d+)/i),
    respiratoryRate: getEditableVitalValue(incident, "respiratoryRate", /(?:RR|Respiratory rate)\s+(\d+)/i),
    temperature: getEditableVitalValue(incident, "temperature", /(?:Temp|Temperature)\s+(\d+(?:\.\d+)?)/i),
    oxygenSaturation: getEditableVitalValue(incident, "oxygenSaturation", /O2\s+(\d+)%/i),
    consciousnessLevel: incident.consciousnessLevel ?? extractVitalFromSummary(incident, /Consciousness\s+([^;.]+)/i),
    chronicConditions: incident.chronicConditions ?? "",
    currentMedications: incident.currentMedications ?? "",
    allergies: incident.allergies ?? "",
    medicalAidScheme: incident.medicalAidScheme ?? "",
    paramedicNotes: incident.paramedicNotes ?? "",
    prescription: getPrescription(incident),
    cancellationReason: getCancellationReason(incident),
    severity: incident.severity ?? "Yellow",
    department: formatDepartment(getDepartment(incident)),
    patientStatus: getPatientStatus(incident),
    status: incident.status ?? "Pending"
  };
}

function buildPatientDirectoryEditForm(patient) {
  if (!patient) {
    return defaultPatientDirectoryEditForm;
  }

  const sourceCase = patient.sourceCase;

  return {
    patientName: patient.fullName === "Unknown patient" ? "" : patient.fullName ?? "",
    patientIdNumber: patient.idNumber ?? sourceCase?.patientIdNumber ?? sourceCase?.idNumber ?? "",
    age: patient.age?.toString() ?? sourceCase?.age?.toString() ?? "",
    gender: patient.gender ?? sourceCase?.gender ?? "",
    address: patient.address ?? sourceCase?.address ?? "",
    nextOfKinName: patient.nextOfKinName ?? sourceCase?.nextOfKinName ?? "",
    nextOfKinRelationship: patient.nextOfKinRelationship ?? sourceCase?.nextOfKinRelationship ?? "",
    nextOfKinPhone: patient.nextOfKinPhone ?? sourceCase?.nextOfKinPhone ?? ""
  };
}

function buildStaffProfileForm(member) {
  if (!member) {
    return defaultStaffProfileForm;
  }

  return {
    name: member.name ?? "",
    specialization: member.specialization ?? "",
    emailAddress: member.emailAddress ?? "",
    phoneNumber: member.phoneNumber ?? member.phone ?? ""
  };
}

function optionalNumber(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function formatRecordDate(value) {
  if (!value) {
    return "Not captured";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not captured";
  }

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRecordTime(value) {
  if (!value) {
    return "Not captured";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not captured";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizePatientKey(incident) {
  const idNumber = incident?.patientIdNumber ?? incident?.idNumber;
  if (idNumber) {
    return `id:${String(idNumber).trim().toLowerCase()}`;
  }

  return `name:${getPatientName(incident).trim().toLowerCase()}`;
}

function formatPatientDirectoryId(index) {
  return `P-${String(index + 1).padStart(3, "0")}`;
}

function matchesGenderFilter(gender, filter) {
  if (filter === "all") {
    return true;
  }

  const value = String(gender ?? "").trim().toLowerCase();
  return filter === "male"
    ? value === "male" || value === "m"
    : value === "female" || value === "f";
}

function maskIdentifier(value) {
  if (!value) {
    return "Not captured";
  }

  const text = String(value);
  return text.length <= 6 ? text : `${text.slice(0, 6)}****`;
}

function maskPhone(value) {
  if (!value) {
    return "Not captured";
  }

  const text = String(value);
  return text.length <= 6 ? text : `${text.slice(0, 3)}****${text.slice(-4)}`;
}

function formatStaffId(index) {
  return `S-${String(index + 1).padStart(3, "0")}`;
}

function getStaffRole(member) {
  const specialization = String(member?.specialization ?? "");
  if (/nurse/i.test(specialization)) {
    return "Nurse";
  }

  if (/doctor|cardiology|trauma|neurology|pediatrics|radiology|critical|icu|general/i.test(specialization)) {
    return "Doctor";
  }

  return specialization || "Staff";
}

function getStaffDepartment(member) {
  return member?.specialization ?? "General";
}

function getStaffStatus(member) {
  if (!member?.isOnDuty) {
    return "Offline";
  }

  return member.isBusy || member.currentCaseCount >= 2 ? "Busy" : "Available";
}

function matchesStaffStatus(member, status) {
  return status === "all" || getStaffStatus(member).toLowerCase() === status;
}

function getCaseAgeMinutes(incident) {
  const createdTime = new Date(incident?.createdAt ?? 0).getTime();
  if (!Number.isFinite(createdTime) || createdTime <= 0) {
    return null;
  }

  return Math.max(1, Math.round((Date.now() - createdTime) / 60000));
}

function formatMinutes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "No data";
  }

  if (value < 60) {
    return `${Math.round(value)} min`;
  }

  const hours = value / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr`;
}

function formatCompactDateTime(value) {
  if (!value) {
    return "No time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No time";
  }

  const datePart = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
  const timePart = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${datePart} ${timePart}`;
}

function formatRelativeTime(value) {
  if (!value) {
    return "No assignment";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No assignment";
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) {
    return "Just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
}

export function DashboardPage() {
  const { token, user, logout } = useAuth();
  const {
    cases,
    isLoading,
    connectionState,
    recentlyUpdatedCaseIds,
    refreshCases
  } = useCases(token);

  const [activeRail, setActiveRail] = useState("dashboard");
  const [mapView, setMapView] = useState("3d");
  const [searchTerm, setSearchTerm] = useState("");
  const [cascadeType, setCascadeType] = useState("any");
  const [cascadeValue, setCascadeValue] = useState("all");
  const [cascadeRefinement, setCascadeRefinement] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [staff, setStaff] = useState([]);
  const [actionMode, setActionMode] = useState("assign");
  const [assignDepartment, setAssignDepartment] = useState("");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [delegationTargetStaffId, setDelegationTargetStaffId] = useState("");
  const [delegationType, setDelegationType] = useState("Short");
  const [delegationReason, setDelegationReason] = useState("Temporary support requested from dashboard workflow.");
  const [escalationLevel, setEscalationLevel] = useState("Department Lead");
  const [escalationReason, setEscalationReason] = useState("Selected case requires department lead review.");
  const [notifyLead, setNotifyLead] = useState(true);
  const [pendingCaseAction, setPendingCaseAction] = useState("");
  const [actionHistory, setActionHistory] = useState([]);
  const [canvasFocus, setCanvasFocus] = useState("overview");
  const [inspectedStaffId, setInspectedStaffId] = useState("");
  const [completionNotes, setCompletionNotes] = useState("Clinical work completed; case ready to close.");
  const [completionPrescription, setCompletionPrescription] = useState("Treatment completed; discharge advice and follow-up instructions provided.");
  const [cancellationNotes, setCancellationNotes] = useState("Case cancelled from dashboard workflow.");
  const [newCaseForm, setNewCaseForm] = useState(defaultNewCaseForm);
  const [patientProfileForm, setPatientProfileForm] = useState(defaultPatientProfileForm);
  const [patientDirectoryEditForm, setPatientDirectoryEditForm] = useState(defaultPatientDirectoryEditForm);
  const [staffProfileForm, setStaffProfileForm] = useState(defaultStaffProfileForm);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [openStatusMenu, setOpenStatusMenu] = useState("");
  const [newCaseAlert, setNewCaseAlert] = useState(null);
  const [highlightedDepartment, setHighlightedDepartment] = useState("");
  const [caseRecordStatus, setCaseRecordStatus] = useState("all");
  const [caseRecordDepartment, setCaseRecordDepartment] = useState("all");
  const [caseRecordDateFrom, setCaseRecordDateFrom] = useState("");
  const [caseRecordDateTo, setCaseRecordDateTo] = useState("");
  const [caseRecordSort, setCaseRecordSort] = useState("newest");
  const [caseRecordPage, setCaseRecordPage] = useState(1);
  const [patientGenderFilter, setPatientGenderFilter] = useState("all");
  const [patientAgeMin, setPatientAgeMin] = useState("");
  const [patientAgeMax, setPatientAgeMax] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [selectedPatientKey, setSelectedPatientKey] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [staffNameFilter, setStaffNameFilter] = useState("");
  const [staffDepartmentFilter, setStaffDepartmentFilter] = useState("all");
  const [staffStatusFilter, setStaffStatusFilter] = useState("all");
  const [staffPage, setStaffPage] = useState(1);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [insightDateRange, setInsightDateRange] = useState("7d");
  const [insightDepartment, setInsightDepartment] = useState("all");
  const [insightStaffId, setInsightStaffId] = useState("all");

  const railFilteredCases = useMemo(() => {
    return cases.filter((incident) => matchesRailFilter(incident, activeRail));
  }, [activeRail, cases]);

  const cascadeValueOptions = useMemo(() => {
    if (cascadeType === "any") {
      return smartSetOptions;
    }

    if (cascadeType === "department") {
      return [
        { value: "all", label: "All Department" },
        ...clinicDepartments.map((department) => ({ value: department.id, label: department.label }))
      ];
    }

    return [{ value: "all", label: `All ${cascadeFilterTypes.find((item) => item.id === cascadeType)?.label ?? "values"}` }, ...getUniqueOptions(railFilteredCases, cascadeType)];
  }, [cascadeType, railFilteredCases]);

  const refinementType = getRefinementType(cascadeType);
  const refinementOptions = useMemo(() => {
    if (!refinementType) {
      return [{ value: "all", label: "No refinement" }];
    }

    const baseCases = railFilteredCases.filter((incident) => {
      if (cascadeType === "any") {
        return matchesSmartSet(incident, cascadeValue);
      }

      return cascadeValue === "all" || getFilterValue(incident, cascadeType) === cascadeValue;
    });

    const refinementLabel = cascadeFilterTypes.find((item) => item.id === refinementType)?.label ?? "refinements";
    return [{ value: "all", label: `All ${refinementLabel}` }, ...getUniqueOptions(baseCases, refinementType)];
  }, [cascadeType, cascadeValue, railFilteredCases, refinementType]);

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return railFilteredCases
      .filter((incident) => statusFilter === "ALL" || normalizeStatus(incident.status) === normalizeStatus(statusFilter))
      .filter((incident) => {
        if (cascadeType === "any") {
          return matchesSmartSet(incident, cascadeValue);
        }

        return cascadeValue === "all" || getFilterValue(incident, cascadeType) === cascadeValue;
      })
      .filter((incident) => cascadeRefinement === "all" || !refinementType || getFilterValue(incident, refinementType) === cascadeRefinement)
      .filter((incident) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          getCaseDisplayCode(incident),
          getPatientName(incident),
          getZoneName(incident),
          formatDepartment(getDepartment(incident)),
          getSymptomsSummary(incident),
          getAssignedStaffName(incident),
          incident.status
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [cascadeRefinement, cascadeType, cascadeValue, railFilteredCases, refinementType, searchTerm, statusFilter]);

  const statusScopedCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return railFilteredCases
      .filter((incident) => {
        if (cascadeType === "any") {
          return matchesSmartSet(incident, cascadeValue);
        }

        return cascadeValue === "all" || getFilterValue(incident, cascadeType) === cascadeValue;
      })
      .filter((incident) => cascadeRefinement === "all" || !refinementType || getFilterValue(incident, refinementType) === cascadeRefinement)
      .filter((incident) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          getCaseDisplayCode(incident),
          getPatientName(incident),
          getZoneName(incident),
          formatDepartment(getDepartment(incident)),
          getSymptomsSummary(incident),
          getAssignedStaffName(incident),
          incident.status
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [cascadeRefinement, cascadeType, cascadeValue, railFilteredCases, refinementType, searchTerm]);

  const searchSuggestions = useMemo(() => {
    return [
      ...cases.flatMap((incident) => [
        getCaseDisplayCode(incident),
        getPatientName(incident),
        incident.patientIdNumber,
        incident.idNumber,
        incident.contactNumber,
        incident.nextOfKinPhone,
        getSymptomsSummary(incident),
        formatDepartment(getDepartment(incident)),
        getAssignedStaffName(incident)
      ]),
      ...clinicDepartments.map((department) => department.label),
      ...staff.map((member) => member.name)
    ]
      .filter(Boolean)
      .filter((value) => value !== "Unassigned")
      .filter((value, index, values) => values.indexOf(value) === index)
      .sort((left, right) => left.localeCompare(right));
  }, [cases, staff]);

  const statusCounts = useMemo(() => {
    return statusScopedCases.reduce(
      (counts, incident) => {
        const status = normalizeStatus(incident.status);
        const hasPendingDelegation = Boolean(incident.pendingDelegationId ?? incident.delegationRequestId);
        return {
          ...counts,
          pendingDelegations: counts.pendingDelegations + (hasPendingDelegation ? 1 : 0),
          [status]: (counts[status] ?? 0) + 1
        };
      },
      { all: railFilteredCases.length, pendingDelegations: 0, pending: 0, assigned: 0, inprogress: 0, completed: 0, cancelled: 0 }
    );
  }, [railFilteredCases.length, statusScopedCases]);

  const casesByStatusMenu = useMemo(() => {
    const sortedCases = [...statusScopedCases].sort((left, right) => {
      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    });

    const sortedResetCases = [...cases].sort((left, right) => {
      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    });

    return statusFilterOptions.reduce((groups, option) => {
      if (option.id === "ALL") {
        groups[option.id] = sortedResetCases;
        return groups;
      }

      if (option.id === "PendingDelegations") {
        groups[option.id] = sortedCases.filter((incident) => Boolean(incident.pendingDelegationId ?? incident.delegationRequestId));
        return groups;
      }

      groups[option.id] = sortedCases.filter((incident) => normalizeStatus(incident.status) === normalizeStatus(option.id));
      return groups;
    }, {});
  }, [cases, statusScopedCases]);

  const casesByDepartment = useMemo(() => {
    return clinicDepartments.reduce((groups, department) => {
      groups[department.id] = filteredCases.filter((incident) => formatDepartment(getDepartment(incident)) === department.id);
      return groups;
    }, {});
  }, [filteredCases]);

  const caseRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const fromTime = caseRecordDateFrom ? new Date(`${caseRecordDateFrom}T00:00:00`).getTime() : null;
    const toTime = caseRecordDateTo ? new Date(`${caseRecordDateTo}T23:59:59`).getTime() : null;

    return [...cases]
      .filter((incident) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          getCaseDisplayCode(incident),
          getPatientName(incident),
          formatDepartment(getDepartment(incident))
        ].join(" ").toLowerCase().includes(normalizedSearch);
      })
      .filter((incident) => {
        if (caseRecordStatus === "completed") {
          return normalizeStatus(incident.status) === "completed";
        }

        if (caseRecordStatus === "active") {
          return !["completed", "cancelled"].includes(normalizeStatus(incident.status));
        }

        return true;
      })
      .filter((incident) => caseRecordDepartment === "all" || formatDepartment(getDepartment(incident)) === caseRecordDepartment)
      .filter((incident) => {
        const createdTime = new Date(incident.createdAt ?? 0).getTime();
        if (Number.isNaN(createdTime)) {
          return false;
        }

        return (fromTime === null || createdTime >= fromTime) && (toTime === null || createdTime <= toTime);
      })
      .sort((left, right) => {
        if (caseRecordSort === "patient") {
          return getPatientName(left).localeCompare(getPatientName(right));
        }

        if (caseRecordSort === "department") {
          return formatDepartment(getDepartment(left)).localeCompare(formatDepartment(getDepartment(right)));
        }

        return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
      });
  }, [caseRecordDateFrom, caseRecordDateTo, caseRecordDepartment, caseRecordSort, caseRecordStatus, cases, searchTerm]);

  const caseRecordPageSize = 10;
  const caseRecordTotalPages = Math.max(1, Math.ceil(caseRecords.length / caseRecordPageSize));
  const pagedCaseRecords = useMemo(() => {
    const startIndex = (caseRecordPage - 1) * caseRecordPageSize;
    return caseRecords.slice(startIndex, startIndex + caseRecordPageSize);
  }, [caseRecordPage, caseRecords]);

  const selectedCaseFallback = activeRail === "assignment" ? caseRecords[0] : filteredCases[0];
  const selectedCase = useMemo(() => {
    return cases.find((incident) => getCaseId(incident) === selectedCaseId) ?? selectedCaseFallback ?? cases[0];
  }, [cases, selectedCaseFallback, selectedCaseId]);

  const patientDirectory = useMemo(() => {
    // Patients are grouped from case history; there is no separate patient table.
    const patientMap = new Map();

    cases.forEach((incident) => {
      const key = normalizePatientKey(incident);
      const existing = patientMap.get(key);
      const currentCases = existing ? [...existing.cases, incident] : [incident];
      const sortedCases = currentCases.sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime());
      const latestCase = sortedCases[0];

      patientMap.set(key, {
        key,
        sourceCase: latestCase,
        cases: sortedCases,
        fullName: getPatientName(latestCase),
        idNumber: latestCase.patientIdNumber ?? latestCase.idNumber ?? "",
        age: latestCase.age ?? "",
        gender: latestCase.gender ?? "",
        contact: latestCase.contactNumber ?? latestCase.nextOfKinPhone ?? "",
        address: latestCase.address ?? "",
        lastVisit: latestCase.createdAt,
        totalCases: sortedCases.length,
        chronicConditions: latestCase.chronicConditions ?? "",
        allergies: latestCase.allergies ?? "",
        currentMedications: latestCase.currentMedications ?? "",
        nextOfKinName: latestCase.nextOfKinName ?? "",
        nextOfKinRelationship: latestCase.nextOfKinRelationship ?? "",
        nextOfKinPhone: latestCase.nextOfKinPhone ?? ""
      });
    });

    return [...patientMap.values()]
      .sort((left, right) => new Date(right.lastVisit ?? 0).getTime() - new Date(left.lastVisit ?? 0).getTime())
      .map((patient, index) => ({ ...patient, patientCode: formatPatientDirectoryId(index) }));
  }, [cases]);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const minAge = patientAgeMin === "" ? null : Number(patientAgeMin);
    const maxAge = patientAgeMax === "" ? null : Number(patientAgeMax);

    return patientDirectory
      .filter((patient) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          patient.fullName,
          patient.idNumber,
          patient.contact
        ].join(" ").toLowerCase().includes(normalizedSearch);
      })
      .filter((patient) => matchesGenderFilter(patient.gender, patientGenderFilter))
      .filter((patient) => {
        const age = Number(patient.age);
        if (!Number.isFinite(age)) {
          return minAge === null && maxAge === null;
        }

        return (minAge === null || age >= minAge) && (maxAge === null || age <= maxAge);
      });
  }, [patientAgeMax, patientAgeMin, patientDirectory, patientGenderFilter, searchTerm]);

  const patientPageSize = 10;
  const patientTotalPages = Math.max(1, Math.ceil(filteredPatients.length / patientPageSize));
  const pagedPatients = useMemo(() => {
    const startIndex = (patientPage - 1) * patientPageSize;
    return filteredPatients.slice(startIndex, startIndex + patientPageSize);
  }, [filteredPatients, patientPage]);

  const selectedPatient = useMemo(() => {
    return patientDirectory.find((patient) => patient.key === selectedPatientKey) ?? filteredPatients[0] ?? patientDirectory[0] ?? null;
  }, [filteredPatients, patientDirectory, selectedPatientKey]);

  const insightCases = useMemo(() => {
    const selectedRange = insightDateRangeOptions.find((option) => option.value === insightDateRange) ?? insightDateRangeOptions[1];
    const cutoffTime = Date.now() - selectedRange.days * 24 * 60 * 60000;

    return cases.filter((incident) => {
      const createdTime = new Date(incident.createdAt ?? 0).getTime();
      if (!Number.isFinite(createdTime) || createdTime < cutoffTime) {
        return false;
      }

      const matchesDepartment = insightDepartment === "all" || formatDepartment(getDepartment(incident)) === insightDepartment;
      const matchesStaff = insightStaffId === "all" || incident.assignedStaffId === insightStaffId;

      return matchesDepartment && matchesStaff;
    });
  }, [cases, insightDateRange, insightDepartment, insightStaffId]);

  const insightMetrics = useMemo(() => {
    const activeCases = insightCases.filter((incident) => !["completed", "cancelled", "canceled"].includes(normalizeStatus(incident.status)));
    const completedCases = insightCases.filter((incident) => normalizeStatus(incident.status) === "completed");
    const timedCases = insightCases.map(getCaseAgeMinutes).filter((value) => Number.isFinite(value));
    const averageMinutes = timedCases.length
      ? timedCases.reduce((total, value) => total + value, 0) / timedCases.length
      : 0;

    return {
      total: insightCases.length,
      active: activeCases.length,
      completed: completedCases.length,
      averageResolution: formatMinutes(averageMinutes)
    };
  }, [insightCases]);

  const insightCasesOverTime = useMemo(() => {
    const selectedRange = insightDateRangeOptions.find((option) => option.value === insightDateRange) ?? insightDateRangeOptions[1];
    const bucketCount = selectedRange.value === "24h" ? 6 : selectedRange.days;
    const bucketMs = selectedRange.value === "24h" ? 4 * 60 * 60000 : 24 * 60 * 60000;
    const startTime = Date.now() - bucketCount * bucketMs;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = startTime + index * bucketMs;
      const bucketDate = new Date(bucketStart);
      return {
        label: selectedRange.value === "24h"
          ? bucketDate.toLocaleTimeString([], { hour: "2-digit" })
          : bucketDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        count: 0
      };
    });

    insightCases.forEach((incident) => {
      const createdTime = new Date(incident.createdAt ?? 0).getTime();
      const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor((createdTime - startTime) / bucketMs)));
      buckets[bucketIndex].count += 1;
    });

    return buckets;
  }, [insightCases, insightDateRange]);

  const departmentPerformance = useMemo(() => {
    return clinicDepartments
      .map((department) => {
        const departmentCases = insightCases.filter((incident) => formatDepartment(getDepartment(incident)) === department.id);
        const timedCases = departmentCases.map(getCaseAgeMinutes).filter((value) => Number.isFinite(value));
        const averageMinutes = timedCases.length
          ? timedCases.reduce((total, value) => total + value, 0) / timedCases.length
          : 0;

        return {
          department: department.label,
          cases: departmentCases.length,
          averageMinutes,
          averageTime: formatMinutes(averageMinutes)
        };
      })
      .filter((item) => item.cases > 0)
      .sort((left, right) => right.cases - left.cases);
  }, [insightCases]);

  const statusBreakdown = useMemo(() => {
    const groups = insightCases.reduce((items, incident) => {
      const status = incident.status ?? "Pending";
      items[status] = (items[status] ?? 0) + 1;
      return items;
    }, {});

    return Object.entries(groups)
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count);
  }, [insightCases]);

  const staffWorkloadInsights = useMemo(() => {
    return staff
      .map((member) => {
        const handledCases = insightCases.filter((incident) => incident.assignedStaffId === member.id);
        const timedCases = handledCases.map(getCaseAgeMinutes).filter((value) => Number.isFinite(value));
        const averageMinutes = timedCases.length
          ? timedCases.reduce((total, value) => total + value, 0) / timedCases.length
          : 0;

        return {
          name: member.name,
          cases: handledCases.length,
          averageTime: formatMinutes(averageMinutes)
        };
      })
      .filter((item) => item.cases > 0)
      .sort((left, right) => right.cases - left.cases);
  }, [insightCases, staff]);

  const currentAssignedStaff = useMemo(() => {
    if (!selectedCase?.assignedStaffId) {
      return null;
    }
    return staff.find((member) => member.id === selectedCase.assignedStaffId) ?? null;
  }, [selectedCase, staff]);

  const selectedDepartmentLabel = useMemo(() => {
    return formatDepartment(getDepartment(selectedCase ?? {}));
  }, [selectedCase]);

  const staffOptions = useMemo(() => {
    if (!assignDepartment) {
      return [...staff].sort(sortStaffByAvailability);
    }

    const specializations = departmentStaffSpecializations[assignDepartment] ?? [assignDepartment];
    const matchingStaff = staff.filter((member) => specializations.includes(member.specialization));
    return [...matchingStaff].sort(sortStaffByAvailability);
  }, [assignDepartment, staff]);

  useEffect(() => {
    if (canvasFocus !== "patient-profile") {
      return;
    }

    setPatientProfileForm(buildPatientProfileForm(selectedCase));
  }, [canvasFocus, selectedCase]);

  useEffect(() => {
    if (canvasFocus !== "complete") {
      return;
    }

    setCompletionPrescription(getPrescription(selectedCase) || "Treatment completed; discharge advice and follow-up instructions provided.");
  }, [canvasFocus, selectedCase]);

  const delegationStaffOptions = useMemo(() => {
    return staff
      .filter((member) => isDelegationTargetEligible(member, selectedCase))
      .filter((member) => member.id !== selectedCase?.assignedStaffId)
      .sort(sortStaffByAvailability);
  }, [selectedCase, staff]);

  const selectedAssignStaff = useMemo(() => {
    return staffOptions.find((member) => member.id === assignStaffId) ?? null;
  }, [assignStaffId, staffOptions]);

  const inspectedStaff = useMemo(() => {
    if (!inspectedStaffId) {
      return null;
    }

    return staff.find((member) => member.id === inspectedStaffId) ?? null;
  }, [inspectedStaffId, staff]);

  const inspectedStaffCases = useMemo(() => {
    if (!inspectedStaff) {
      return { active: [], previous: [] };
    }

    const staffCases = cases
      .filter((incident) => incident.assignedStaffId === inspectedStaff.id)
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime());

    return {
      active: staffCases
        .filter((incident) => !isClosedCase(incident))
        .slice(0, 4),
      previous: staffCases
        .filter((incident) => isClosedCase(incident))
    };
  }, [cases, inspectedStaff]);

  const inspectedStaffStats = useMemo(() => {
    const allStaffCases = [...inspectedStaffCases.active, ...inspectedStaffCases.previous];
    const startedCases = allStaffCases
      .map((incident) => new Date(incident.createdAt ?? 0).getTime())
      .filter((time) => Number.isFinite(time) && time > 0);

    if (!inspectedStaff || startedCases.length === 0) {
      return {
        activeCases: inspectedStaff?.currentCaseCount ?? 0,
        averageHandlingTime: "No data",
        lastAssignment: "No assignment"
      };
    }

    const now = Date.now();
    const averageMinutes = Math.max(
      1,
      Math.round(startedCases.reduce((total, time) => total + Math.max(0, now - time), 0) / startedCases.length / 60000)
    );
    const lastAssignmentTime = Math.max(...startedCases);

    return {
      activeCases: inspectedStaff.currentCaseCount,
      averageHandlingTime: `${averageMinutes} min`,
      lastAssignment: formatRelativeTime(lastAssignmentTime)
    };
  }, [inspectedStaff, inspectedStaffCases]);

  const inspectedStaffLoad = useMemo(() => {
    if (!inspectedStaff) {
      return { label: "No staff selected", className: "load-neutral" };
    }

    if (inspectedStaff.isBusy || inspectedStaff.currentCaseCount >= 2) {
      return { label: "Overloaded", className: "load-high" };
    }

    if (inspectedStaff.currentCaseCount === 1) {
      return { label: "Moderate", className: "load-moderate" };
    }

    return { label: "Available", className: "load-low" };
  }, [inspectedStaff]);

  const activeFilterSummary = useMemo(() => {
    const parts = [];
    const selectedMatch = cascadeValueOptions.find((item) => item.value === cascadeValue);
    const selectedNarrow = refinementOptions.find((item) => item.value === cascadeRefinement);

    if (searchTerm.trim()) {
      parts.push(`Search: ${searchTerm.trim()}`);
    }

    if (cascadeValue !== "all" && selectedMatch) {
      parts.push(`Match: ${selectedMatch.label}`);
    }

    if (cascadeRefinement !== "all" && selectedNarrow) {
      parts.push(`Narrow: ${selectedNarrow.label}`);
    }

    if (statusFilter !== "ALL") {
      parts.push(`Status: ${statusFilter}`);
    }

    return parts.length ? parts.join(" / ") : "All cases";
  }, [cascadeRefinement, cascadeValue, cascadeValueOptions, refinementOptions, searchTerm, statusFilter]);

  const selectedDelegationTargetStaff = useMemo(() => {
    return delegationStaffOptions.find((member) => member.id === delegationTargetStaffId) ?? null;
  }, [delegationStaffOptions, delegationTargetStaffId]);

  const selectedCaseTimeline = useMemo(() => {
    if (!selectedCase) {
      return [];
    }

    const caseId = getCaseId(selectedCase);
    const baseItems = [
      {
        id: `${caseId}-received`,
        tone: normalizeSeverity(selectedCase.severity).toLowerCase(),
        title: getCaseDisplayCode(selectedCase),
        detail: getPatientName(selectedCase),
        symptoms: getSymptomsSummary(selectedCase),
        severity: formatSeverityLabel(selectedCase.severity),
        severityTone: normalizeSeverity(selectedCase.severity).toLowerCase(),
        time: selectedCase.createdAt ? formatCompactDateTime(selectedCase.createdAt) : "Now"
      },
      {
        id: `${caseId}-staff`,
        tone: selectedCase.assignedStaffId ? "green" : "orange",
        title: selectedCase.assignedStaffId ? "Staff assigned" : "Awaiting staff assignment",
        detail: selectedCase.assignedStaffId
          ? `${getAssignedStaffName(selectedCase)} owns this case.`
          : "No clinician is assigned yet.",
        time: formatEta(selectedCase.eta)
      }
    ];

    if (selectedCase.pendingDelegationId) {
      baseItems.push({
        id: `${caseId}-delegation`,
        tone: "yellow",
        title: "Delegation pending",
        detail: "A handoff request is waiting for a response.",
        time: selectedCase.createdAt ? formatCompactDateTime(selectedCase.createdAt) : "Pending"
      });
    }

    return [...actionHistory.filter((item) => item.caseId === caseId), ...baseItems];
  }, [actionHistory, selectedCase]);

  const statusPipeline = useMemo(() => {
    if (!selectedCase) {
      return [];
    }

    return [
      {
        label: "Received",
        detail: selectedCase.createdAt
          ? new Date(selectedCase.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Logged"
      },
      { label: "Triage", detail: formatSeverityLabel(selectedCase.severity) },
      { label: "Assigned", detail: getAssignedStaffName(selectedCase) },
      { label: "Current", detail: selectedCase.status ?? "Pending" }
    ];
  }, [selectedCase]);

  const etaRoute = useMemo(() => {
    if (!selectedCase) {
      return [];
    }

    const destination = getZoneCoordinates(getZoneName(selectedCase));
    const staffZone = currentAssignedStaff?.zone ?? "Emergency Intake";
    const origin = getZoneCoordinates(staffZone);

    return [{ label: staffZone, ...origin }, { label: getZoneName(selectedCase), ...destination }];
  }, [currentAssignedStaff, selectedCase]);

  const staffDirectory = useMemo(() => {
    return [...staff].sort((left, right) => {
      const specializationSort = left.specialization.localeCompare(right.specialization);
      if (specializationSort !== 0) {
        return specializationSort;
      }
      return left.name.localeCompare(right.name);
    }).map((member, index) => ({ ...member, staffCode: formatStaffId(index) }));
  }, [staff]);

  const filteredStaffDirectory = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedStaffName = staffNameFilter.trim().toLowerCase();

    return staffDirectory
      .filter((member) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          member.name,
          getStaffRole(member),
          getStaffDepartment(member)
        ].join(" ").toLowerCase().includes(normalizedSearch);
      })
      .filter((member) => !normalizedStaffName || member.name.toLowerCase().includes(normalizedStaffName))
      .filter((member) => staffRoleFilter === "all" || getStaffRole(member).toLowerCase() === staffRoleFilter)
      .filter((member) => staffDepartmentFilter === "all" || getStaffDepartment(member) === staffDepartmentFilter)
      .filter((member) => matchesStaffStatus(member, staffStatusFilter));
  }, [searchTerm, staffDepartmentFilter, staffDirectory, staffNameFilter, staffRoleFilter, staffStatusFilter]);

  const staffPageSize = 10;
  const staffTotalPages = Math.max(1, Math.ceil(filteredStaffDirectory.length / staffPageSize));
  const pagedStaffDirectory = useMemo(() => {
    const startIndex = (staffPage - 1) * staffPageSize;
    return filteredStaffDirectory.slice(startIndex, startIndex + staffPageSize);
  }, [filteredStaffDirectory, staffPage]);

  const selectedStaff = useMemo(() => {
    return staffDirectory.find((member) => member.id === selectedStaffId) ?? filteredStaffDirectory[0] ?? staffDirectory[0] ?? null;
  }, [filteredStaffDirectory, selectedStaffId, staffDirectory]);

  const selectedStaffCases = useMemo(() => {
    if (!selectedStaff) {
      return { active: [], previous: [] };
    }

    const staffCases = cases
      .filter((incident) => incident.assignedStaffId === selectedStaff.id)
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime());

    return {
      active: staffCases.filter((incident) => !isClosedCase(incident)),
      previous: staffCases.filter((incident) => isClosedCase(incident))
    };
  }, [cases, selectedStaff]);

  const selectedStaffStats = useMemo(() => {
    const allCases = [...selectedStaffCases.active, ...selectedStaffCases.previous];
    const startedCases = allCases
      .map((incident) => new Date(incident.createdAt ?? 0).getTime())
      .filter((time) => Number.isFinite(time) && time > 0);

    if (!startedCases.length) {
      return { averageHandlingTime: "No data" };
    }

    const averageMinutes = Math.max(
      1,
      Math.round(startedCases.reduce((total, time) => total + Math.max(0, Date.now() - time), 0) / startedCases.length / 60000)
    );

    return { averageHandlingTime: `${averageMinutes} min` };
  }, [selectedStaffCases]);

  useEffect(() => {
    if (!cases.length) {
      setSelectedCaseId("");
      return;
    }

    const selectedStillExists = cases.some((incident) => getCaseId(incident) === selectedCaseId);
    const selectionPool = activeRail === "assignment"
      ? caseRecords
      : activeRail === "dashboard"
        ? filteredCases
        : cases;
    const selectedStillVisible = selectionPool.some((incident) => getCaseId(incident) === selectedCaseId);

    if (selectionPool.length && !selectedStillVisible) {
      setSelectedCaseId(getCaseId(selectionPool[0] ?? cases[0]));
      return;
    }

    if (!selectedStillExists) {
      setSelectedCaseId(getCaseId(cases[0]));
    }
  }, [activeRail, caseRecords, cases, filteredCases, selectedCaseId]);

  useEffect(() => {
    setCascadeValue("all");
    setCascadeRefinement("all");
  }, [cascadeType]);

  useEffect(() => {
    async function loadStaff() {
      try {
        setStaff(await getStaff());
      } catch {
        showNotice("Staff list could not be loaded.", "error");
      }
    }
    void loadStaff();
  }, []);

  useEffect(() => {
    if (!selectedCase) {
      return;
    }
    setAssignDepartment(selectedDepartmentLabel);
    setDelegationTargetStaffId(delegationStaffOptions.find((member) => member.isOnDuty && !member.isBusy)?.id ?? delegationStaffOptions[0]?.id ?? "");
  }, [delegationStaffOptions, selectedCase, selectedDepartmentLabel]);

  useEffect(() => {
    if (!selectedCase) {
      return;
    }

    const existingAssignedStaffIsVisible = staffOptions.some((member) => member.id === selectedCase.assignedStaffId);
    const firstAvailableStaff = staffOptions.find((member) => member.isOnDuty && !member.isBusy) ?? staffOptions[0];
    setAssignStaffId(existingAssignedStaffIsVisible ? selectedCase.assignedStaffId : firstAvailableStaff?.id ?? "");
  }, [selectedCase, staffOptions]);

  useEffect(() => {
    setCaseRecordPage(1);
  }, [caseRecordDateFrom, caseRecordDateTo, caseRecordDepartment, caseRecordSort, caseRecordStatus, searchTerm]);

  useEffect(() => {
    setPatientPage(1);
  }, [patientAgeMax, patientAgeMin, patientGenderFilter, searchTerm]);

  useEffect(() => {
    setStaffPage(1);
  }, [searchTerm, staffDepartmentFilter, staffNameFilter, staffRoleFilter, staffStatusFilter]);

  function selectCase(incident) {
    setSelectedCaseId(getCaseId(incident));
  }

  function openCaseSummaryCanvas(incident) {
    setSelectedCaseId(getCaseId(incident));
    setInspectedStaffId("");
    setCanvasFocus("case-summary");
  }

  function focusNewCase(incident, nextActionMode = actionMode) {
    setSelectedCaseId(getCaseId(incident));
    setCascadeType("any");
    setCascadeValue("all");
    setCascadeRefinement("all");
    setStatusFilter("ALL");
    setActionMode(nextActionMode);
    setCanvasFocus(["assign", "delegate", "escalate"].includes(nextActionMode) ? nextActionMode : "overview");
    setNewCaseAlert(null);
  }

  function handleActionModeSelect(nextActionMode) {
    setActionMode(nextActionMode);
    setInspectedStaffId("");
    setCanvasFocus((currentFocus) => currentFocus === nextActionMode ? "overview" : nextActionMode);
  }

  function handleAssignStaffChange(nextStaffId) {
    setAssignStaffId(nextStaffId);
    setInspectedStaffId("");
  }

  function handleDelegationTargetStaffChange(nextStaffId) {
    setDelegationTargetStaffId(nextStaffId);
    setInspectedStaffId("");
  }

  function resetCaseFilters() {
    setSearchTerm("");
    setCascadeType("any");
    setCascadeValue("all");
    setCascadeRefinement("all");
    setStatusFilter("ALL");
  }

  function handleStatusFilterClick(statusId) {
    if (statusId === "ALL") {
      resetCaseFilters();
      return;
    }

    if (statusId === "PendingDelegations") {
      setCascadeType("any");
      setCascadeValue(cascadeValue === "delegated" ? "all" : "delegated");
      setCascadeRefinement("all");
      setStatusFilter("ALL");
      return;
    }

    setStatusFilter(statusFilter === statusId ? "ALL" : statusId);
  }

  function selectStatusMenuCase(incident, statusId) {
    if (statusId === "ALL") {
      resetCaseFilters();
    } else if (statusId === "PendingDelegations") {
      setCascadeType("any");
      setCascadeValue("delegated");
      setCascadeRefinement("all");
      setStatusFilter("ALL");
      setActionMode("delegate");
      setCanvasFocus("delegate");
    } else {
      setStatusFilter(statusId);
    }

    setSelectedCaseId(getCaseId(incident));
    setOpenStatusMenu("");
  }

  function closeCanvas() {
    setCanvasFocus("overview");
    setInspectedStaffId("");
  }

  function updateNewCaseForm(field, value) {
    setNewCaseForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function updatePatientProfileForm(field, value) {
    setPatientProfileForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function updatePatientDirectoryEditForm(field, value) {
    setPatientDirectoryEditForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function updateStaffProfileForm(field, value) {
    setStaffProfileForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function openPatientDirectoryEditCanvas(patient) {
    if (!patient) {
      return;
    }

    setSelectedPatientKey(patient.key);
    setPatientDirectoryEditForm(buildPatientDirectoryEditForm(patient));
    setCanvasFocus("patient-directory-edit");
  }

  function openStaffProfileEditCanvas(member) {
    if (!member) {
      return;
    }

    setSelectedStaffId(member.id);
    setStaffProfileForm(buildStaffProfileForm(member));
    setCanvasFocus("staff-directory-edit");
  }

  function exportCaseRecordsCsv() {
    const rows = [
      ["Case ID", "Patient", "Age", "Gender", "Complaint", "Department", "Status", "Assigned", "Date", "Time"],
      ...caseRecords.map((incident) => [
        getCaseDisplayCode(incident),
        getPatientName(incident),
        incident.age ?? "",
        incident.gender ?? "",
        getSymptomsSummary(incident),
        formatDepartment(getDepartment(incident)),
        incident.status ?? "",
        getAssignedStaffName(incident),
        formatRecordDate(incident.createdAt),
        formatRecordTime(incident.createdAt)
      ])
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "case-records.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function recordTimelineItem(incident, title, detail, tone = "green") {
    setActionHistory((items) => [
      {
        id: `${getCaseId(incident)}-${Date.now()}`,
        caseId: getCaseId(incident),
        title,
        detail,
        tone,
        time: formatCompactDateTime(new Date())
      },
      ...items
    ]);
  }

  async function handleAssignSubmit(event) {
    event.preventDefault();
    if (!selectedCase || !assignStaffId) {
      return;
    }

    try {
      setPendingCaseAction("assign");
      const updatedCase = await assignCase({
        caseId: getCaseId(selectedCase),
        staffId: assignStaffId,
        notes: "Assigned from right-panel case workflow."
      });
      const assignedStaff = staff.find((member) => member.id === assignStaffId);
      recordTimelineItem(updatedCase, "Assignment started", `${assignedStaff?.name ?? "Selected staff"} assigned to ${getCaseDisplayCode(updatedCase)} and the case moved to InProgress.`);
      showNotice("Case assignment saved and moved to InProgress.", "success");
      await refreshCases();
      setSelectedCaseId(getCaseId(updatedCase));
      setStaff(await getStaff());
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handlePatientProfileSubmit(event) {
    event.preventDefault();
    if (!selectedCase) {
      return;
    }

    try {
      setPendingCaseAction("patient-profile");
      const updatedCase = await updateCasePatientProfile(getCaseId(selectedCase), {
        patientName: patientProfileForm.patientName,
        patientIdNumber: patientProfileForm.patientIdNumber,
        age: optionalNumber(patientProfileForm.age),
        gender: patientProfileForm.gender,
        address: patientProfileForm.address,
        nextOfKinName: patientProfileForm.nextOfKinName,
        nextOfKinRelationship: patientProfileForm.nextOfKinRelationship,
        nextOfKinPhone: patientProfileForm.nextOfKinPhone,
        bloodPressure: patientProfileForm.bloodPressure,
        heartRate: optionalNumber(patientProfileForm.heartRate),
        respiratoryRate: optionalNumber(patientProfileForm.respiratoryRate),
        temperature: optionalNumber(patientProfileForm.temperature),
        oxygenSaturation: optionalNumber(patientProfileForm.oxygenSaturation),
        consciousnessLevel: patientProfileForm.consciousnessLevel,
        chronicConditions: patientProfileForm.chronicConditions,
        currentMedications: patientProfileForm.currentMedications,
        allergies: patientProfileForm.allergies,
        medicalAidScheme: patientProfileForm.medicalAidScheme,
        paramedicNotes: patientProfileForm.paramedicNotes,
        prescription: patientProfileForm.prescription,
        cancellationReason: patientProfileForm.cancellationReason,
        severity: patientProfileForm.severity,
        department: patientProfileForm.department,
        requiredSpecialization: patientProfileForm.department,
        patientStatus: patientProfileForm.patientStatus,
        status: patientProfileForm.status
      });
      recordTimelineItem(updatedCase, "Patient profile updated", `${getCaseDisplayCode(updatedCase)} profile details were updated.`, "green");
      showNotice("Patient profile updated.", "success");
      await refreshCases();
      setSelectedCaseId(getCaseId(updatedCase));
    } catch (error) {
      showNotice(error.response?.data?.message ?? "Patient profile could not be updated.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handlePatientDirectoryEditSubmit(event) {
    event.preventDefault();
    if (!selectedPatient?.sourceCase) {
      showNotice("No patient source case is available to update.", "error");
      return;
    }

    const profile = buildPatientProfileForm(selectedPatient.sourceCase);

    try {
      setPendingCaseAction("patient-directory-edit");
      const updatedCase = await updateCasePatientProfile(getCaseId(selectedPatient.sourceCase), {
        patientName: patientDirectoryEditForm.patientName,
        patientIdNumber: patientDirectoryEditForm.patientIdNumber,
        age: optionalNumber(patientDirectoryEditForm.age),
        gender: patientDirectoryEditForm.gender,
        address: patientDirectoryEditForm.address,
        nextOfKinName: patientDirectoryEditForm.nextOfKinName,
        nextOfKinRelationship: patientDirectoryEditForm.nextOfKinRelationship,
        nextOfKinPhone: patientDirectoryEditForm.nextOfKinPhone,
        bloodPressure: profile.bloodPressure,
        heartRate: optionalNumber(profile.heartRate),
        respiratoryRate: optionalNumber(profile.respiratoryRate),
        temperature: optionalNumber(profile.temperature),
        oxygenSaturation: optionalNumber(profile.oxygenSaturation),
        consciousnessLevel: profile.consciousnessLevel,
        chronicConditions: profile.chronicConditions,
        currentMedications: profile.currentMedications,
        allergies: profile.allergies,
        medicalAidScheme: profile.medicalAidScheme,
        paramedicNotes: profile.paramedicNotes,
        prescription: profile.prescription,
        cancellationReason: profile.cancellationReason,
        severity: profile.severity,
        department: profile.department,
        requiredSpecialization: profile.department,
        patientStatus: profile.patientStatus,
        status: profile.status
      });

      showNotice("Patient personal and contact details updated.", "success");
      await refreshCases();
      setSelectedCaseId(getCaseId(updatedCase));
      setSelectedPatientKey(normalizePatientKey(updatedCase));
      setCanvasFocus("overview");
    } catch (error) {
      showNotice(error.response?.data?.message ?? "Patient details could not be updated.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleStaffProfileSubmit(event) {
    event.preventDefault();
    if (!selectedStaff) {
      return;
    }

    try {
      setPendingCaseAction("staff-directory-edit");
      const updatedStaffMember = await updateStaffProfile(selectedStaff.id, {
        name: staffProfileForm.name,
        specialization: staffProfileForm.specialization,
        emailAddress: staffProfileForm.emailAddress,
        phoneNumber: staffProfileForm.phoneNumber
      });

      setStaff((currentStaff) => currentStaff.map((member) => (
        member.id === updatedStaffMember.id ? updatedStaffMember : member
      )));
      setSelectedStaffId(updatedStaffMember.id);
      showNotice("Staff personal and contact details updated.", "success");
      setCanvasFocus("overview");
    } catch (error) {
      showNotice(error.response?.data?.message ?? "Staff details could not be updated.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleDelegationSubmit(event) {
    event.preventDefault();
    if (!selectedCase?.assignedStaffId || !delegationTargetStaffId) {
      showNotice("Assign staff before requesting delegation.", "error");
      return;
    }

    try {
      setPendingCaseAction("delegate");
      await requestDelegation({
        fromStaffId: selectedCase.assignedStaffId,
        toStaffId: delegationTargetStaffId,
        caseId: getCaseId(selectedCase),
        type: delegationType,
        reason: delegationReason
      });
      const targetStaff = staff.find((member) => member.id === delegationTargetStaffId);
      recordTimelineItem(selectedCase, "Delegation requested", `${getAssignedStaffName(selectedCase)} requested ${delegationType.toLowerCase()} support from ${targetStaff?.name ?? "selected staff"}.`, "yellow");
      showNotice("Delegation request created.", "success");
      await refreshCases();
    } catch (error) {
      showNotice(error.response?.data?.message ?? "Delegation request could not be created.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleEscalationSubmit(event) {
    event.preventDefault();
    if (!selectedCase) {
      return;
    }

    try {
      setPendingCaseAction("escalate");
      const updatedCase = await escalateCase({
        caseId: getCaseId(selectedCase),
        level: escalationLevel,
        reason: escalationReason,
        notifyDepartmentLead: notifyLead
      });
      const caseForUi = updatedCase?.id || updatedCase?.caseId ? updatedCase : selectedCase;
      recordTimelineItem(caseForUi, "Case escalated", `${escalationLevel}: ${escalationReason}`, "red");
      showNotice(updatedCase?.notificationWarning ?? "Case escalation recorded.", updatedCase?.notificationWarning ? "warning" : "critical");
      await refreshCases();
      setSelectedCaseId(getCaseId(caseForUi));
    } catch (error) {
      showNotice(error.response?.data?.detail ?? error.response?.data?.message ?? "Case escalation could not be recorded.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleNewCaseSubmit(event) {
    event.preventDefault();

    try {
      setPendingCaseAction("new-case");
      const createdCase = await createCase({
        patientName: newCaseForm.patientName,
        severity: newCaseForm.severity,
        department: newCaseForm.department,
        symptomsSummary: newCaseForm.symptomsSummary,
        zoneName: newCaseForm.zoneName,
        status: patientStatusToCaseStatus[newCaseForm.patientStatus] ?? "Pending",
        patientStatus: newCaseForm.patientStatus,
        requiredSpecialization: newCaseForm.requiredSpecialization || newCaseForm.department,
        etaMinutes: newCaseForm.etaMinutes ? Number(newCaseForm.etaMinutes) : null,
        displayCode: newCaseForm.displayCode
      });
      recordTimelineItem(createdCase, "Case opened", `${getCaseDisplayCode(createdCase)} created from the activity workflow.`, "green");
      showNotice("New case opened.", "success");
      setNewCaseForm(defaultNewCaseForm);
      await refreshCases();
      setSelectedCaseId(getCaseId(createdCase));
      setCanvasFocus("overview");
    } catch (error) {
      showNotice(error.response?.data?.message ?? error.message ?? "New case could not be opened.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleUnassignCase() {
    if (!selectedCase?.assignedStaffId) {
      showNotice("This case is already unassigned.", "info");
      return;
    }

    try {
      setPendingCaseAction("unassign");
      const updatedCase = await unassignCase(getCaseId(selectedCase));
      recordTimelineItem(updatedCase, "Case unassigned", `${getCaseDisplayCode(updatedCase)} returned to the assignment queue.`, "orange");
      showNotice("Case unassigned.", "success");
      await refreshCases();
      setSelectedCaseId(getCaseId(updatedCase));
      setStaff(await getStaff());
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleCompleteCase(event) {
    event.preventDefault();
    if (!selectedCase) {
      return;
    }

    try {
      setPendingCaseAction("complete");
      const updatedCase = await completeCase({
        caseId: getCaseId(selectedCase),
        notes: completionNotes,
        prescription: completionPrescription
      });
      recordTimelineItem(updatedCase, "Case completed", `${getCaseDisplayCode(updatedCase)} was closed from the status workflow.`, "green");
      showNotice("Case marked completed.", "success");
      await refreshCases();
      setSelectedCaseId(getCaseId(updatedCase));
    } finally {
      setPendingCaseAction("");
    }
  }

  async function handleCancelCase(event) {
    event.preventDefault();
    if (!selectedCase) {
      return;
    }

    try {
      setPendingCaseAction("cancel");
      const updatedCase = await cancelCase({
        caseId: getCaseId(selectedCase),
        notes: cancellationNotes
      });
      recordTimelineItem(updatedCase, "Case cancelled", `${getCaseDisplayCode(updatedCase)} was cancelled from the status workflow.`, "orange");
      showNotice("Case cancelled.", "success");
      await refreshCases();
      setSelectedCaseId(getCaseId(updatedCase));
      setStaff(await getStaff());
      setCanvasFocus("overview");
    } catch (error) {
      showNotice(error.response?.data?.message ?? "Case could not be cancelled.", "error");
    } finally {
      setPendingCaseAction("");
    }
  }

  useEffect(() => {
    function handleNewCaseAlert(event) {
      const incident = event.detail?.incident;
      if (!incident) {
        return;
      }

      const severity = normalizeSeverity(incident.severity);
      const department = formatDepartment(getDepartment(incident));

      setHighlightedDepartment(department);
      window.setTimeout(() => {
        setHighlightedDepartment((currentDepartment) =>
          currentDepartment === department ? "" : currentDepartment
        );
      }, 8000);

      if (severity === "RED") {
        setNewCaseAlert(incident);
      }
    }

    window.addEventListener("app:new-case", handleNewCaseAlert);
    return () => window.removeEventListener("app:new-case", handleNewCaseAlert);
  }, []);

  useEffect(() => {
    if (canvasFocus === "overview") {
      return undefined;
    }

    function handleOutsideCanvasClick(event) {
      const clickedCanvas = event.target.closest?.(".canvas-overlay");
      const clickedCanvasToggle = event.target.closest?.("[data-canvas-toggle='true']");

      if (!clickedCanvas && !clickedCanvasToggle) {
        closeCanvas();
      }
    }

    document.addEventListener("mousedown", handleOutsideCanvasClick);
    return () => document.removeEventListener("mousedown", handleOutsideCanvasClick);
  }, [canvasFocus]);

  useEffect(() => {
    if (!openStatusMenu) {
      return undefined;
    }

    function handleOutsideStatusMenuClick(event) {
      if (!event.target.closest?.(".status-split-control")) {
        setOpenStatusMenu("");
      }
    }

    document.addEventListener("mousedown", handleOutsideStatusMenuClick);
    return () => document.removeEventListener("mousedown", handleOutsideStatusMenuClick);
  }, [openStatusMenu]);

  return (
    <main className="ops-shell">
      <aside className="ops-rail" aria-label="Primary navigation">
        {railItems.map((item) => (
          <button
            aria-label={item.label}
            aria-pressed={activeRail === item.id}
            className={`rail-button ${activeRail === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => setActiveRail(item.id)}
            title={`${item.label}: ${item.description}`}
            type="button"
          >
            {item.label}
          </button>
        ))}
        <div className="rail-spacer" />
        <button
          className="rail-button"
          onClick={() => showNotice("Use the rail to switch between operational views and staff profiles.")}
          title="Help"
          type="button"
        >
          ?
        </button>
        <button
          className="rail-button user-dot"
          onClick={() => showNotice(`Signed in as ${user?.username ?? "current user"}.`)}
          title={user?.username ?? "Current user"}
          type="button"
        >
          {user?.username?.[0]?.toUpperCase() ?? "U"}
        </button>
      </aside>

      <section className="ops-workspace">
        <header className="ops-topbar">
          <div>
            <span className="workspace-kicker">MedLink Dashboard</span>
            <h1>Public Clinic Triage</h1>
          </div>
          <div className="command-tools">
            <label className="command-search">
              <span>Search</span>
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                list="case-search-suggestions"
                placeholder="Case, patient, symptom, department, staff"
                value={searchTerm}
              />
              <datalist id="case-search-suggestions">
                {searchSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </label>
            <div className="cascade-filters" aria-label="Cascaded case filters">
              <label>
                <span>Filter</span>
                <select value={cascadeType} onChange={(event) => setCascadeType(event.target.value)}>
                  {cascadeFilterTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Match</span>
                <select value={cascadeValue} onChange={(event) => setCascadeValue(event.target.value)}>
                  {cascadeValueOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Narrow</span>
                <select value={cascadeRefinement} onChange={(event) => setCascadeRefinement(event.target.value)}>
                  {refinementOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="dashboard-actions">
            <span className={`hub-state ${connectionState.toLowerCase()}`}>{connectionState}</span>
            <button type="button" className="secondary-button" onClick={refreshCases}>Refresh</button>
            <button type="button" onClick={logout}>Log out</button>
          </div>
        </header>

        {newCaseAlert && (
          <aside className={`new-case-alert alert-${normalizeSeverity(newCaseAlert.severity).toLowerCase()}`} role="alert">
            <div>
              <span>New Case Received</span>
              <button
                aria-label="Dismiss new case alert"
                className="alert-close"
                onClick={() => setNewCaseAlert(null)}
                type="button"
              >
                X
              </button>
            </div>
            <h2>
              {getCaseDisplayCode(newCaseAlert)} / {formatSeverityLabel(newCaseAlert.severity)} Priority
            </h2>
            <dl>
              <div>
                <dt>Patient</dt>
                <dd>{getPatientName(newCaseAlert)}</dd>
              </div>
              <div>
                <dt>Symptoms</dt>
                <dd>{getSymptomsSummary(newCaseAlert)}</dd>
              </div>
              <div>
                <dt>Suggested Dept</dt>
                <dd>{formatDepartment(getDepartment(newCaseAlert))}</dd>
              </div>
            </dl>
            <div className="new-case-alert-actions">
              <button type="button" onClick={() => focusNewCase(newCaseAlert)}>
                View Case
              </button>
              <button type="button" onClick={() => focusNewCase(newCaseAlert, "assign")}>
                Assign Now
              </button>
              <button className="secondary-button" type="button" onClick={() => setNewCaseAlert(null)}>
                Dismiss
              </button>
            </div>
          </aside>
        )}

        <div className="view-strip">
          <strong>{railItems.find((item) => item.id === activeRail)?.label ?? "Dashboard"}</strong>
          <span>{railItems.find((item) => item.id === activeRail)?.description ?? ""}</span>
          <span>{activeFilterSummary}</span>
          <small>{filteredCases.length} visible of {railFilteredCases.length}</small>
        </div>

        {activeRail === "assignment" && (
          <section className="case-records-panel" aria-label="Case records">
            <header className="records-header">
              <div>
                <span>Case Records</span>
                <h2>Searchable case registry</h2>
              </div>
              <button className="secondary-button" type="button" onClick={exportCaseRecordsCsv}>Export CSV</button>
            </header>
            <div className="record-filters">
              <label>
                <span>Status</span>
                <select value={caseRecordStatus} onChange={(event) => setCaseRecordStatus(event.target.value)}>
                  {caseRecordStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Department</span>
                <select value={caseRecordDepartment} onChange={(event) => setCaseRecordDepartment(event.target.value)}>
                  <option value="all">All departments</option>
                  {clinicDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
                </select>
              </label>
              <label>
                <span>From</span>
                <input type="date" value={caseRecordDateFrom} onChange={(event) => setCaseRecordDateFrom(event.target.value)} />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={caseRecordDateTo} onChange={(event) => setCaseRecordDateTo(event.target.value)} />
              </label>
              <label>
                <span>Sort</span>
                <select value={caseRecordSort} onChange={(event) => setCaseRecordSort(event.target.value)}>
                  {caseRecordSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <div className="records-table-wrap">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Complaint</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Date</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCaseRecords.map((incident) => (
                    <tr
                      className={getCaseId(incident) === getCaseId(selectedCase ?? {}) ? "selected" : ""}
                      key={getCaseId(incident)}
                      onClick={() => selectCase(incident)}
                      tabIndex={0}
                    >
                      <td>{getCaseDisplayCode(incident)}</td>
                      <td>{getPatientName(incident)}</td>
                      <td>{getProfileValue(incident.age, "")}</td>
                      <td>{getProfileValue(incident.gender, "")}</td>
                      <td>{getSymptomsSummary(incident)}</td>
                      <td>{formatDepartment(getDepartment(incident))}</td>
                      <td>{incident.status}</td>
                      <td>{getAssignedStaffName(incident)}</td>
                      <td>{formatRecordDate(incident.createdAt)}</td>
                      <td>{formatRecordTime(incident.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {caseRecords.length === 0 && <div className="records-empty">No case records match the current filters.</div>}
            <footer className="records-footer">
              <span>
                Showing {caseRecords.length === 0 ? 0 : (caseRecordPage - 1) * caseRecordPageSize + 1}
                -{Math.min(caseRecordPage * caseRecordPageSize, caseRecords.length)} of {caseRecords.length} cases
              </span>
              <div>
                <button className="secondary-button" type="button" disabled={caseRecordPage === 1} onClick={() => setCaseRecordPage((page) => Math.max(1, page - 1))}>Previous</button>
                <button className="secondary-button" type="button" disabled={caseRecordPage === caseRecordTotalPages} onClick={() => setCaseRecordPage((page) => Math.min(caseRecordTotalPages, page + 1))}>Next</button>
              </div>
            </footer>
            {selectedCase && (
              <aside className="record-detail-panel">
                <h3>{getCaseDisplayCode(selectedCase)} / {getPatientName(selectedCase)}</h3>
                <dl>
                  <div><dt>Department</dt><dd>{formatDepartment(getDepartment(selectedCase))}</dd></div>
                  <div><dt>Status</dt><dd>{selectedCase.status}</dd></div>
                  <div><dt>Patient status</dt><dd>{getPatientStatus(selectedCase)}</dd></div>
                  <div><dt>Vitals</dt><dd>{getVitalValue(selectedCase, "heartRate", /HR\s+(\d+)/i, " bpm")} / {getVitalValue(selectedCase, "oxygenSaturation", /O2\s+(\d+)%/i, "%")}</dd></div>
                  <div><dt>Assigned</dt><dd>{getAssignedStaffName(selectedCase)}</dd></div>
                  <div><dt>Created</dt><dd>{formatRecordDate(selectedCase.createdAt)} {formatRecordTime(selectedCase.createdAt)}</dd></div>
                  {shouldShowPrescription(selectedCase) && (
                    <div><dt>Prescription / Solution</dt><dd>{getProfileValue(getPrescription(selectedCase))}</dd></div>
                  )}
                  {shouldShowCancellationReason(selectedCase) && (
                    <div><dt>Cancellation reason</dt><dd>{getProfileValue(getCancellationReason(selectedCase))}</dd></div>
                  )}
                </dl>
                <button type="button" onClick={() => setCanvasFocus("patient-profile")}>Open Patient Profile</button>
              </aside>
            )}
          </section>
        )}

        {activeRail === "patients" && (
          <section className="patients-panel" aria-label="Patients directory">
            <header className="patients-header">
              <div>
                <span>Patients</span>
                <h2>Master patient directory</h2>
              </div>
              <small>{filteredPatients.length} patients</small>
            </header>
            <div className="patient-filters">
              <label>
                <span>Gender</span>
                <select value={patientGenderFilter} onChange={(event) => setPatientGenderFilter(event.target.value)}>
                  {patientGenderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Min age</span>
                <input min="0" type="number" value={patientAgeMin} onChange={(event) => setPatientAgeMin(event.target.value)} />
              </label>
              <label>
                <span>Max age</span>
                <input min="0" type="number" value={patientAgeMax} onChange={(event) => setPatientAgeMax(event.target.value)} />
              </label>
            </div>
            <div className="patients-layout">
              <div className="patients-table-wrap">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Full Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Contact</th>
                      <th>Last Visit</th>
                      <th>Total Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPatients.map((patient) => (
                      <tr
                        className={selectedPatient?.key === patient.key ? "selected" : ""}
                        key={patient.key}
                        onClick={() => setSelectedPatientKey(patient.key)}
                        tabIndex={0}
                      >
                        <td>{patient.patientCode}</td>
                        <td>{patient.fullName}</td>
                        <td>{getProfileValue(patient.age, "")}</td>
                        <td>{getProfileValue(patient.gender, "")}</td>
                        <td>{maskPhone(patient.contact)}</td>
                        <td>{formatRecordDate(patient.lastVisit)}</td>
                        <td>{patient.totalCases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPatients.length === 0 && <div className="records-empty">No patients match the current filters.</div>}
                <footer className="records-footer">
                  <span>
                    Showing {filteredPatients.length === 0 ? 0 : (patientPage - 1) * patientPageSize + 1}
                    -{Math.min(patientPage * patientPageSize, filteredPatients.length)} of {filteredPatients.length} patients
                  </span>
                  <div>
                    <button className="secondary-button" type="button" disabled={patientPage === 1} onClick={() => setPatientPage((page) => Math.max(1, page - 1))}>Previous</button>
                    <button className="secondary-button" type="button" disabled={patientPage === patientTotalPages} onClick={() => setPatientPage((page) => Math.min(patientTotalPages, page + 1))}>Next</button>
                  </div>
                </footer>
              </div>
              {selectedPatient && (
                <aside className="longitudinal-profile">
                  <header>
                    <div>
                      <h3>{selectedPatient.fullName}</h3>
                      <span>{getProfileValue(selectedPatient.age, "Age not captured")} / {getProfileValue(selectedPatient.gender, "Gender not captured")}</span>
                    </div>
                    <small>ID: {maskIdentifier(selectedPatient.idNumber)}</small>
                    <small>Contact: {maskPhone(selectedPatient.contact)}</small>
                  </header>
                  <div className="patient-summary-strip">
                    <div><span>Total Cases</span><strong>{selectedPatient.totalCases}</strong></div>
                    <div><span>Last Visit</span><strong>{formatRecordDate(selectedPatient.lastVisit)}</strong></div>
                    <div><span>Chronic Conditions</span><strong>{getProfileValue(selectedPatient.chronicConditions)}</strong></div>
                    <div><span>Allergies</span><strong>{getProfileValue(selectedPatient.allergies)}</strong></div>
                  </div>
                  <section>
                    <h4>Medical Background</h4>
                    <dl>
                      <div><dt>Chronic Conditions</dt><dd>{getProfileValue(selectedPatient.chronicConditions)}</dd></div>
                      <div><dt>Allergies</dt><dd>{getProfileValue(selectedPatient.allergies)}</dd></div>
                      <div><dt>Medications</dt><dd>{getProfileValue(selectedPatient.currentMedications)}</dd></div>
                    </dl>
                  </section>
                  <section>
                    <h4>Case History</h4>
                    <div className="patient-case-history">
                      {selectedPatient.cases.map((incident) => (
                        <button
                          data-canvas-toggle="true"
                          key={getCaseId(incident)}
                          onClick={() => openCaseSummaryCanvas(incident)}
                          type="button"
                        >
                          <span>{getCaseDisplayCode(incident)} / {formatRecordDate(incident.createdAt)}</span>
                          <strong>{getSymptomsSummary(incident)}</strong>
                          <small>{incident.status}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="directory-info-block">
                    <h4>Contact Info</h4>
                    <button className="secondary-button directory-edit-button" data-canvas-toggle="true" type="button" onClick={() => openPatientDirectoryEditCanvas(selectedPatient)}>
                      Edit personal/contact
                    </button>
                    <dl>
                      <div><dt>Address</dt><dd>{getProfileValue(selectedPatient.address)}</dd></div>
                    </dl>
                  </section>
                  <section>
                    <h4>Emergency Contact</h4>
                    <dl>
                      <div><dt>Next of kin</dt><dd>{getProfileValue(selectedPatient.nextOfKinName)}</dd></div>
                      <div><dt>Relationship</dt><dd>{getProfileValue(selectedPatient.nextOfKinRelationship)}</dd></div>
                      <div><dt>Alternative number</dt><dd>{maskPhone(selectedPatient.nextOfKinPhone)}</dd></div>
                    </dl>
                  </section>
                </aside>
              )}
              {selectedPatient && canvasFocus === "patient-directory-edit" && (
                <article className="canvas-overlay action-canvas-panel directory-edit-canvas">
                  <header>
                    <span>Patient Details</span>
                    <div className="canvas-header-actions">
                      <strong>{selectedPatient.fullName}</strong>
                      <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                    </div>
                  </header>
                  <form className="canvas-action-form" onSubmit={handlePatientDirectoryEditSubmit}>
                    <div className="canvas-action-grid">
                      <label>
                        <span>Full name</span>
                        <input value={patientDirectoryEditForm.patientName} onChange={(event) => updatePatientDirectoryEditForm("patientName", event.target.value)} />
                      </label>
                      <label>
                        <span>ID / Passport</span>
                        <input value={patientDirectoryEditForm.patientIdNumber} onChange={(event) => updatePatientDirectoryEditForm("patientIdNumber", event.target.value)} />
                      </label>
                      <label>
                        <span>Age</span>
                        <input min="0" type="number" value={patientDirectoryEditForm.age} onChange={(event) => updatePatientDirectoryEditForm("age", event.target.value)} />
                      </label>
                      <label>
                        <span>Gender</span>
                        <input value={patientDirectoryEditForm.gender} onChange={(event) => updatePatientDirectoryEditForm("gender", event.target.value)} />
                      </label>
                      <label>
                        <span>Address</span>
                        <input value={patientDirectoryEditForm.address} onChange={(event) => updatePatientDirectoryEditForm("address", event.target.value)} />
                      </label>
                      <label>
                        <span>Alternative number</span>
                        <input value={patientDirectoryEditForm.nextOfKinPhone} onChange={(event) => updatePatientDirectoryEditForm("nextOfKinPhone", event.target.value)} />
                      </label>
                      <label>
                        <span>Next of kin</span>
                        <input value={patientDirectoryEditForm.nextOfKinName} onChange={(event) => updatePatientDirectoryEditForm("nextOfKinName", event.target.value)} />
                      </label>
                      <label>
                        <span>Relationship</span>
                        <input value={patientDirectoryEditForm.nextOfKinRelationship} onChange={(event) => updatePatientDirectoryEditForm("nextOfKinRelationship", event.target.value)} />
                      </label>
                    </div>
                    <button className="primary-action-button" disabled={pendingCaseAction === "patient-directory-edit"} type="submit">
                      {pendingCaseAction === "patient-directory-edit" ? "Updating..." : "Update patient details"}
                    </button>
                  </form>
                </article>
              )}
            </div>
          </section>
        )}

        {activeRail === "analytics" && (
          <section className="insights-panel" aria-label="Operational insights">
            <header className="insights-header">
              <div>
                <span>Insights</span>
                <h2>Operational intelligence</h2>
              </div>
              <small>Read-only decision lens</small>
            </header>
            <div className="insight-filters">
              <label>
                <span>Date range</span>
                <select value={insightDateRange} onChange={(event) => setInsightDateRange(event.target.value)}>
                  {insightDateRangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Department</span>
                <select value={insightDepartment} onChange={(event) => setInsightDepartment(event.target.value)}>
                  <option value="all">All departments</option>
                  {clinicDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
                </select>
              </label>
              <label>
                <span>Staff member</span>
                <select value={insightStaffId} onChange={(event) => setInsightStaffId(event.target.value)}>
                  <option value="all">All staff</option>
                  {staffDirectory.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="insight-metrics">
              <div><span>Total Cases</span><strong>{insightMetrics.total}</strong></div>
              <div><span>Active Cases</span><strong>{insightMetrics.active}</strong></div>
              <div><span>Completed Cases</span><strong>{insightMetrics.completed}</strong></div>
              <div><span>Avg Resolution Time</span><strong>{insightMetrics.averageResolution}</strong></div>
            </div>
            <div className="insight-charts">
              <section className="insight-chart-card">
                <h3>Cases Over Time</h3>
                <div className="time-chart">
                  {insightCasesOverTime.map((bucket) => {
                    const maxCount = Math.max(1, ...insightCasesOverTime.map((item) => item.count));
                    return (
                      <div className="time-chart-column" key={bucket.label}>
                        <span style={{ height: `${Math.max(6, (bucket.count / maxCount) * 100)}%` }} />
                        <small>{bucket.label}</small>
                        <strong>{bucket.count}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="insight-chart-card">
                <h3>Cases by Department</h3>
                <div className="bar-chart">
                  {departmentPerformance.length > 0 ? departmentPerformance.map((item) => {
                    const maxCases = Math.max(1, ...departmentPerformance.map((department) => department.cases));
                    return (
                      <div className="bar-row" key={item.department}>
                        <span>{item.department}</span>
                        <div><i style={{ width: `${Math.max(4, (item.cases / maxCases) * 100)}%` }} /></div>
                        <strong>{item.cases}</strong>
                      </div>
                    );
                  }) : <div className="records-empty">No department data for this filter.</div>}
                </div>
              </section>
              <section className="insight-chart-card">
                <h3>Case Status Breakdown</h3>
                <div className="bar-chart">
                  {statusBreakdown.length > 0 ? statusBreakdown.map((item) => {
                    const maxStatus = Math.max(1, ...statusBreakdown.map((status) => status.count));
                    return (
                      <div className="bar-row" key={item.status}>
                        <span>{item.status}</span>
                        <div><i style={{ width: `${Math.max(4, (item.count / maxStatus) * 100)}%` }} /></div>
                        <strong>{item.count}</strong>
                      </div>
                    );
                  }) : <div className="records-empty">No status data for this filter.</div>}
                </div>
              </section>
              <section className="insight-chart-card">
                <h3>Avg Resolution Time by Department</h3>
                <div className="bar-chart">
                  {departmentPerformance.length > 0 ? departmentPerformance.map((item) => {
                    const maxMinutes = Math.max(1, ...departmentPerformance.map((department) => department.averageMinutes));
                    return (
                      <div className="bar-row" key={item.department}>
                        <span>{item.department}</span>
                        <div><i style={{ width: `${Math.max(4, (item.averageMinutes / maxMinutes) * 100)}%` }} /></div>
                        <strong>{item.averageTime}</strong>
                      </div>
                    );
                  }) : <div className="records-empty">No timing data for this filter.</div>}
                </div>
              </section>
            </div>
            <div className="insight-tables">
              <section>
                <h3>Department Performance</h3>
                <table>
                  <thead><tr><th>Department</th><th>Cases</th><th>Avg Time</th></tr></thead>
                  <tbody>
                    {departmentPerformance.map((item) => (
                      <tr key={item.department}><td>{item.department}</td><td>{item.cases}</td><td>{item.averageTime}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section>
                <h3>Staff Workload</h3>
                <table>
                  <thead><tr><th>Staff</th><th>Cases Handled</th><th>Avg Time</th></tr></thead>
                  <tbody>
                    {staffWorkloadInsights.map((item) => (
                      <tr key={item.name}><td>{item.name}</td><td>{item.cases}</td><td>{item.averageTime}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </section>
        )}

        {selectedCase && canvasFocus === "case-summary" && (
          <article className="canvas-overlay staff-case-canvas case-summary-canvas">
            <header>
              <span>Case Summary</span>
              <div className="canvas-header-actions">
                <strong>{getCaseDisplayCode(selectedCase)}</strong>
                <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
              </div>
            </header>
            <div className="staff-case-canvas-summary">
              <div><span>Patient</span><strong>{getPatientName(selectedCase)}</strong></div>
              <div><span>Priority</span><strong>{formatSeverityLabel(selectedCase.severity)}</strong></div>
              <div><span>Department</span><strong>{formatDepartment(getDepartment(selectedCase))}</strong></div>
              <div><span>Case status</span><strong>{selectedCase.status}</strong></div>
              <div><span>Patient status</span><strong>{getPatientStatus(selectedCase)}</strong></div>
              <div><span>Assigned</span><strong>{getAssignedStaffName(selectedCase)}</strong></div>
            </div>
            <section className="staff-case-canvas-section">
              <h4>Clinical Summary</h4>
              <p>{getSymptomsSummary(selectedCase)}</p>
            </section>
            <section className="staff-case-canvas-section">
              <h4>Vitals</h4>
              <dl>
                <div><dt>Blood pressure</dt><dd>{getVitalValue(selectedCase, "bloodPressure", /BP\s+([^;.]+)/i)}</dd></div>
                <div><dt>Heart rate</dt><dd>{getVitalValue(selectedCase, "heartRate", /HR\s+(\d+)/i, " bpm")}</dd></div>
                <div><dt>Oxygen saturation</dt><dd>{getVitalValue(selectedCase, "oxygenSaturation", /O2\s+(\d+)%/i, "%")}</dd></div>
              </dl>
            </section>
            {shouldShowPrescription(selectedCase) && (
              <section className="staff-case-canvas-section">
                <h4>Prescription / Solution</h4>
                <p>{getProfileValue(getPrescription(selectedCase))}</p>
              </section>
            )}
            {shouldShowCancellationReason(selectedCase) && (
              <section className="staff-case-canvas-section">
                <h4>Cancellation Reason</h4>
                <p>{getProfileValue(getCancellationReason(selectedCase))}</p>
              </section>
            )}
          </article>
        )}

        {activeRail !== "staff" && activeRail !== "patients" && activeRail !== "analytics" && (activeRail !== "assignment" || canvasFocus === "patient-profile") && (
          <section className={`ops-grid ${activeRail === "assignment" ? "records-canvas-host" : ""}`}>
            <section className="clinic-map-panel">
              <div className="severity-filter-bar" aria-label="Case status filters">
                {statusFilterOptions.map((option) => {
                  const menuCases = casesByStatusMenu[option.id] ?? [];
                  return (
                    <div
                      className={`status-split-control ${option.id === "PendingDelegations" ? "delegation-status-control" : ""}`}
                      key={option.id}
                    >
                      <button
                        className={`severity-chip status-split-main ${option.className} ${statusFilter === option.id ? "active" : ""}`}
                        onClick={() => handleStatusFilterClick(option.id)}
                        type="button"
                      >
                        {option.label} {statusCounts[option.countKey] ?? 0}
                      </button>
                      <button
                        aria-expanded={openStatusMenu === option.id}
                        aria-label={`Show ${option.label} case list`}
                        className={`severity-chip status-split-arrow ${option.className}`}
                        onClick={() => setOpenStatusMenu(openStatusMenu === option.id ? "" : option.id)}
                        type="button"
                      >
                        v
                      </button>
                      {openStatusMenu === option.id && (
                        <div className="status-case-menu">
                          {menuCases.length > 0 ? menuCases.map((incident) => (
                            <button
                              className="status-case-menu-item"
                              key={getCaseId(incident)}
                              onClick={() => selectStatusMenuCase(incident, option.id)}
                              type="button"
                            >
                              <span>{getCaseDisplayCode(incident)}</span>
                              <strong>{getPatientName(incident)}</strong>
                              <small>{formatCompactDateTime(incident.createdAt)} / {formatDepartment(getDepartment(incident))}</small>
                            </button>
                          )) : (
                            <div className="status-case-menu-empty">No cases</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={`clinic-map map-mode-${mapView} canvas-focus-${canvasFocus}`} aria-label="Clinic zone map">
                <div className="map-road map-road-a" />
                <div className="map-road map-road-b" />
                <div className="map-road map-road-c" />
                {clinicDepartments.map((department) => {
                  const departmentCases = casesByDepartment[department.id] ?? [];
                  const selectedInDepartment = selectedCase && formatDepartment(getDepartment(selectedCase)) === department.id;

                  return (
                    <div
                      className={`zone-block ${department.className} ${highlightedDepartment === department.id ? "department-pulse" : ""}`}
                      key={department.id}
                    >
                      <div className="zone-copy">
                        <span>{department.label}</span>
                        <strong>{departmentCases.length}</strong>
                      </div>
                      <select
                        aria-label={`${department.label} case selector`}
                        className="zone-case-select"
                        disabled={departmentCases.length === 0}
                        onChange={(event) => setSelectedCaseId(event.target.value)}
                        value={selectedInDepartment ? getCaseId(selectedCase) : ""}
                      >
                        <option value="">{departmentCases.length ? "Select case" : "No cases"}</option>
                        {departmentCases.map((incident) => (
                          <option key={getCaseId(incident)} value={getCaseId(incident)}>
                            {getCaseDisplayCode(incident)}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                {selectedCase && canvasFocus === "eta" && (
                  <article className="canvas-overlay eta-route-panel">
                    <header>
                      <span>Patient Status</span>
                      <div className="canvas-header-actions">
                        <strong>{getPatientStatus(selectedCase)}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <div className="eta-coordinate-map">
                      <div className="eta-route-line" />
                      {etaRoute.map((point, index) => (
                        <div
                          className={`eta-node eta-node-${index + 1}`}
                          key={`${point.label}-${index}`}
                          style={{ left: `${point.x}%`, top: `${point.y}%` }}
                        >
                          <span>{index + 1}</span>
                          <strong>{point.label}</strong>
                          <small>X {point.x} / Y {point.y}</small>
                        </div>
                      ))}
                    </div>
                    <p>{getPatientName(selectedCase)} is marked as {getPatientStatus(selectedCase)}. Location ETA remains {getEtaMinutes(selectedCase.eta) ?? "pending"} min.</p>
                  </article>
                )}

                {selectedCase && canvasFocus === "staff" && (
                  <article className="canvas-overlay staff-pipeline-panel">
                    <header>
                      <span>Staff Details</span>
                      <div className="canvas-header-actions">
                        <strong>{getAssignedStaffName(selectedCase)}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    {currentAssignedStaff ? (
                      <>
                        <div className="staff-insight-summary">
                          <div>
                            <strong>{currentAssignedStaff.specialization}</strong>
                            <span>{currentAssignedStaff.zone}</span>
                          </div>
                          <span className={`staff-load-chip ${currentAssignedStaff.isBusy || currentAssignedStaff.currentCaseCount >= 2 ? "load-high" : currentAssignedStaff.currentCaseCount === 1 ? "load-moderate" : "load-low"}`}>
                            {currentAssignedStaff.isBusy || currentAssignedStaff.currentCaseCount >= 2 ? "Busy" : currentAssignedStaff.currentCaseCount === 1 ? "Moderate" : "Available"}
                          </span>
                        </div>
                        <div className="staff-insight-stats">
                          <div><span>Active cases</span><strong>{currentAssignedStaff.currentCaseCount}</strong></div>
                          <div><span>Total hours</span><strong>{currentAssignedStaff.totalHoursWorked}h</strong></div>
                          <div><span>Cooldown</span><strong>{currentAssignedStaff.cooldownUntil ? formatCompactDateTime(currentAssignedStaff.cooldownUntil) : "Clear"}</strong></div>
                        </div>
                        <div className="canvas-action-summary">
                          <strong>Current patient</strong>
                          <span>{getPatientName(selectedCase)} / {formatDepartment(getDepartment(selectedCase))} / {getPatientStatus(selectedCase)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="pipeline-empty">No staff member is assigned to this case.</div>
                    )}
                  </article>
                )}

                {selectedCase && canvasFocus === "status" && (
                  <article className="canvas-overlay status-pipeline-panel">
                    <header>
                      <span>Assignment History</span>
                      <div className="canvas-header-actions">
                        <strong>{selectedCase.status}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <div className="status-track">
                      {statusPipeline.map((step, index) => (
                        <div className="status-step" key={`${step.label}-${index}`}>
                          <span>{index + 1}</span>
                          <strong>{step.label}</strong>
                          <small>{step.detail}</small>
                        </div>
                      ))}
                    </div>
                    <button
                      className="danger-button"
                      disabled={!selectedCase.assignedStaffId || pendingCaseAction === "unassign"}
                      onClick={handleUnassignCase}
                      type="button"
                    >
                      {pendingCaseAction === "unassign" ? "Unassigning..." : "Unassign from case"}
                    </button>
                  </article>
                )}

                {selectedCase && canvasFocus === "patient-profile" && (
                  <article className="canvas-overlay patient-profile-panel">
                    <header>
                      <span>Patient Profile</span>
                      <div className="canvas-header-actions">
                        <strong>{getPatientName(selectedCase)}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="patient-profile-form" onSubmit={handlePatientProfileSubmit}>
                      <div className="patient-profile-grid">
                        <section>
                          <h4>Patient Identity</h4>
                          <label><span>Full name</span><input value={patientProfileForm.patientName} onChange={(event) => updatePatientProfileForm("patientName", event.target.value)} /></label>
                          <label><span>ID / Passport</span><input value={patientProfileForm.patientIdNumber} onChange={(event) => updatePatientProfileForm("patientIdNumber", event.target.value)} /></label>
                          <div className="profile-field-row">
                            <label><span>Age</span><input min="0" type="number" value={patientProfileForm.age} onChange={(event) => updatePatientProfileForm("age", event.target.value)} /></label>
                            <label><span>Gender</span><input value={patientProfileForm.gender} onChange={(event) => updatePatientProfileForm("gender", event.target.value)} /></label>
                          </div>
                          <label><span>Address</span><input value={patientProfileForm.address} onChange={(event) => updatePatientProfileForm("address", event.target.value)} /></label>
                        </section>
                        <section>
                          <h4>Emergency Contact</h4>
                          <label><span>Next of kin</span><input value={patientProfileForm.nextOfKinName} onChange={(event) => updatePatientProfileForm("nextOfKinName", event.target.value)} /></label>
                          <label><span>Relationship</span><input value={patientProfileForm.nextOfKinRelationship} onChange={(event) => updatePatientProfileForm("nextOfKinRelationship", event.target.value)} /></label>
                          <label><span>Alternative number</span><input value={patientProfileForm.nextOfKinPhone} onChange={(event) => updatePatientProfileForm("nextOfKinPhone", event.target.value)} /></label>
                        </section>
                        <section>
                          <h4>Vital Signs</h4>
                          <div className="profile-field-row">
                            <label><span>Blood pressure</span><input value={patientProfileForm.bloodPressure} onChange={(event) => updatePatientProfileForm("bloodPressure", event.target.value)} /></label>
                            <label><span>Heart rate</span><input min="0" type="number" value={patientProfileForm.heartRate} onChange={(event) => updatePatientProfileForm("heartRate", event.target.value)} /></label>
                          </div>
                          <div className="profile-field-row">
                            <label><span>Respiratory rate</span><input min="0" type="number" value={patientProfileForm.respiratoryRate} onChange={(event) => updatePatientProfileForm("respiratoryRate", event.target.value)} /></label>
                            <label><span>Temperature</span><input min="0" step="0.1" type="number" value={patientProfileForm.temperature} onChange={(event) => updatePatientProfileForm("temperature", event.target.value)} /></label>
                          </div>
                          <div className="profile-field-row">
                            <label><span>Oxygen saturation</span><input max="100" min="0" type="number" value={patientProfileForm.oxygenSaturation} onChange={(event) => updatePatientProfileForm("oxygenSaturation", event.target.value)} /></label>
                            <label><span>Consciousness</span><select value={patientProfileForm.consciousnessLevel} onChange={(event) => updatePatientProfileForm("consciousnessLevel", event.target.value)}>
                              <option value="">Not captured</option>
                              <option value="Alert">Alert</option>
                              <option value="Confused">Confused</option>
                              <option value="Drowsy">Drowsy</option>
                              <option value="Unconscious">Unconscious</option>
                            </select></label>
                          </div>
                        </section>
                        <section>
                          <h4>Medical Background</h4>
                          <label><span>Chronic conditions</span><textarea rows="2" value={patientProfileForm.chronicConditions} onChange={(event) => updatePatientProfileForm("chronicConditions", event.target.value)} /></label>
                          <label><span>Medications</span><textarea rows="2" value={patientProfileForm.currentMedications} onChange={(event) => updatePatientProfileForm("currentMedications", event.target.value)} /></label>
                          <label><span>Allergies</span><textarea rows="2" value={patientProfileForm.allergies} onChange={(event) => updatePatientProfileForm("allergies", event.target.value)} /></label>
                        </section>
                        <section>
                          <h4>Medical Aid / Billing</h4>
                          <label><span>Scheme</span><select value={patientProfileForm.medicalAidScheme} onChange={(event) => updatePatientProfileForm("medicalAidScheme", event.target.value)}>
                            <option value="">Not captured</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select></label>
                        </section>
                        <section>
                          <h4>Outcome</h4>
                          <label><span>Prescription / Solution</span><textarea rows="3" value={patientProfileForm.prescription} onChange={(event) => updatePatientProfileForm("prescription", event.target.value)} /></label>
                        </section>
                        <section>
                          <h4>Triage Classification</h4>
                          <div className="profile-field-row">
                            <label><span>Priority</span><select value={patientProfileForm.severity} onChange={(event) => updatePatientProfileForm("severity", event.target.value)}>
                              {caseSeverityOptions.map((severity) => <option key={severity} value={severity}>{formatSeverityLabel(severity)}</option>)}
                            </select></label>
                            <label><span>Suggested department</span><select value={patientProfileForm.department} onChange={(event) => updatePatientProfileForm("department", event.target.value)}>
                              {clinicDepartments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
                            </select></label>
                          </div>
                          <div className="profile-field-row">
                            <label><span>Patient status</span><select value={patientProfileForm.patientStatus} onChange={(event) => updatePatientProfileForm("patientStatus", event.target.value)}>
                              {patientStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select></label>
                            <label><span>Case status</span><select value={patientProfileForm.status} onChange={(event) => updatePatientProfileForm("status", event.target.value)}>
                              {statusFilterOptions.filter((status) => !["ALL", "PendingDelegations"].includes(status.id)).map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                            </select></label>
                          </div>
                          <div className="profile-readonly-field"><span>Initial assignment</span><strong>{getAssignedStaffName(selectedCase)}</strong></div>
                          <div className="profile-readonly-field"><span>Case ID</span><strong>{getCaseId(selectedCase)}</strong></div>
                        </section>
                      </div>
                      <footer className="patient-profile-footer">
                        <button className="primary-action-button" disabled={pendingCaseAction === "patient-profile"} type="submit">
                          {pendingCaseAction === "patient-profile" ? "Updating..." : "Update"}
                        </button>
                      </footer>
                    </form>
                  </article>
                )}

                {selectedCase && canvasFocus === "assign" && (
                  <article className="canvas-overlay action-canvas-panel">
                    <header>
                      <span>Assignment Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>{getCaseDisplayCode(selectedCase)}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="canvas-action-form" onSubmit={handleAssignSubmit}>
                      <label>
                        <span>Department</span>
                        <select value={assignDepartment} onChange={(event) => setAssignDepartment(event.target.value)}>
                          {clinicDepartments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Staff member</span>
                        <select value={assignStaffId} onChange={(event) => handleAssignStaffChange(event.target.value)}>
                          {staffOptions.length === 0 && <option value="">No {assignDepartment || "department"} staff available</option>}
                          {staffOptions.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}{member.isBusy ? " - busy" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        aria-controls="staff-insight-canvas"
                        aria-expanded={Boolean(inspectedStaffId)}
                        className="canvas-action-summary staff-summary-button"
                        disabled={!selectedAssignStaff}
                        onClick={() => setInspectedStaffId(selectedAssignStaff?.id ?? "")}
                        type="button"
                      >
                        <strong>{selectedAssignStaff?.name ?? "No staff selected"}</strong>
                        <span>
                          {selectedAssignStaff
                            ? `${assignDepartment} / ${selectedAssignStaff.zone} / ${selectedAssignStaff.currentCaseCount} active cases / ${selectedAssignStaff.isBusy ? "busy" : "available"}`
                            : "Select a department, then select a staff member to preview assignment capacity."}
                        </span>
                      </button>
                      <button type="submit" disabled={!assignStaffId || pendingCaseAction === "assign"}>
                        {pendingCaseAction === "assign" ? "Assigning..." : "Assign to case"}
                      </button>
                    </form>
                  </article>
                )}

                {selectedCase && ["assign", "delegate"].includes(canvasFocus) && inspectedStaffId && inspectedStaff && (
                  <article className="canvas-overlay staff-insight-panel" id="staff-insight-canvas">
                    <header>
                      <span>Staff Insight Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>{inspectedStaff.name}</strong>
                        <button className="canvas-close-button" onClick={() => setInspectedStaffId("")} type="button" aria-label="Close staff insight">X</button>
                      </div>
                    </header>
                    <div className="staff-insight-summary">
                      <div>
                        <strong>{inspectedStaff.specialization}</strong>
                        <span>{inspectedStaff.zone}</span>
                      </div>
                      <span className={`staff-load-chip ${inspectedStaffLoad.className}`}>{inspectedStaffLoad.label}</span>
                    </div>
                    <section className="staff-insight-section">
                      <h4>Active Cases</h4>
                      {inspectedStaffCases.active.length > 0 ? inspectedStaffCases.active.map((incident) => (
                        <button className="staff-case-button" key={getCaseId(incident)} onClick={() => selectCase(incident)} type="button">
                          <span>{getCaseDisplayCode(incident)} / {formatSeverityLabel(incident.severity)} / {incident.status}</span>
                          <strong>Patient: {getPatientName(incident)}</strong>
                          <small>{getSymptomsSummary(incident)} / {formatDepartment(getDepartment(incident))} / {formatEta(incident.eta)}</small>
                        </button>
                      )) : (
                        <div className="pipeline-empty">No active cases assigned.</div>
                      )}
                    </section>
                    <section className="staff-insight-section">
                      <h4>Previous Cases</h4>
                      <div className="staff-case-list history-scroll">
                        {inspectedStaffCases.previous.length > 0 ? inspectedStaffCases.previous.map((incident) => (
                          <button className="staff-case-button" data-canvas-toggle="true" key={getCaseId(incident)} onClick={() => openCaseSummaryCanvas(incident)} type="button">
                            <span>{getCaseDisplayCode(incident)} / {incident.status}</span>
                            <strong>Patient: {getPatientName(incident)}</strong>
                            <small>{getSymptomsSummary(incident)} / {formatDepartment(getDepartment(incident))} / {formatCompactDateTime(incident.createdAt)}</small>
                          </button>
                        )) : (
                          <div className="pipeline-empty">No completed cases in the current case list.</div>
                        )}
                      </div>
                    </section>
                    <div className="staff-insight-stats">
                      <div><span>Active cases</span><strong>{inspectedStaffStats.activeCases}</strong></div>
                      <div><span>Avg handling</span><strong>{inspectedStaffStats.averageHandlingTime}</strong></div>
                      <div><span>Last assignment</span><strong>{inspectedStaffStats.lastAssignment}</strong></div>
                    </div>
                  </article>
                )}

                {canvasFocus === "new-case" && (
                  <article className="canvas-overlay action-canvas-panel new-case-canvas-panel">
                    <header>
                      <span>New Case Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>Open intake</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="canvas-action-form" onSubmit={handleNewCaseSubmit}>
                      <div className="canvas-action-grid">
                        <label>
                          <span>Patient name</span>
                          <input
                            onChange={(event) => updateNewCaseForm("patientName", event.target.value)}
                            placeholder="Patient details pending"
                            value={newCaseForm.patientName}
                          />
                        </label>
                        <label>
                          <span>Display code</span>
                          <input
                            onChange={(event) => updateNewCaseForm("displayCode", event.target.value)}
                            placeholder="Auto generated"
                            value={newCaseForm.displayCode}
                          />
                        </label>
                        <label>
                          <span>Priority</span>
                          <select value={newCaseForm.severity} onChange={(event) => updateNewCaseForm("severity", event.target.value)}>
                            {caseSeverityOptions.map((severity) => (
                              <option key={severity} value={severity}>{severity}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Department</span>
                          <select value={newCaseForm.department} onChange={(event) => updateNewCaseForm("department", event.target.value)}>
                            {clinicDepartments.map((department) => (
                              <option key={department.id} value={department.id}>{department.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Allocation</span>
                          <select value={newCaseForm.zoneName} onChange={(event) => updateNewCaseForm("zoneName", event.target.value)}>
                            {clinicZoneOptions.map((zoneName) => (
                              <option key={zoneName} value={zoneName}>{zoneName}</option>
                            ))}
                          </select>
                          <small className="field-helper">Physical place the patient is allocated to in the facility.</small>
                        </label>
                        <label>
                          <span>Patient status</span>
                          <select value={newCaseForm.patientStatus} onChange={(event) => updateNewCaseForm("patientStatus", event.target.value)}>
                            {patientStatusOptions.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <small className="field-helper">Movement or treatment state, separate from allocation.</small>
                        </label>
                        <label>
                          <span>ETA minutes</span>
                          <input
                            min="1"
                            onChange={(event) => updateNewCaseForm("etaMinutes", event.target.value)}
                            type="number"
                            value={newCaseForm.etaMinutes}
                          />
                        </label>
                      </div>
                      <label>
                        <span>Required specialization</span>
                        <input
                          onChange={(event) => updateNewCaseForm("requiredSpecialization", event.target.value)}
                          placeholder={newCaseForm.department}
                          value={newCaseForm.requiredSpecialization}
                        />
                      </label>
                      <label>
                        <span>Symptoms summary</span>
                        <textarea
                          onChange={(event) => updateNewCaseForm("symptomsSummary", event.target.value)}
                          placeholder="Symptoms pending review."
                          value={newCaseForm.symptomsSummary}
                        />
                      </label>
                      <button type="submit" disabled={pendingCaseAction === "new-case"}>
                        {pendingCaseAction === "new-case" ? "Opening..." : "Open case"}
                      </button>
                    </form>
                  </article>
                )}

                {selectedCase && canvasFocus === "delegate" && (
                  <article className="canvas-overlay action-canvas-panel">
                    <header>
                      <span>Delegation Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>{delegationTypeOptions.find((item) => item.value === delegationType)?.label ?? delegationType}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="canvas-action-form" onSubmit={handleDelegationSubmit}>
                      <div className="canvas-action-grid">
                        <label>
                          <span>From</span>
                          <button
                            aria-controls="staff-insight-canvas"
                            aria-expanded={inspectedStaffId === currentAssignedStaff?.id}
                            className="canvas-staff-field-button"
                            disabled={!currentAssignedStaff}
                            onClick={() => setInspectedStaffId(currentAssignedStaff?.id ?? "")}
                            type="button"
                          >
                            <strong>{currentAssignedStaff?.name ?? getAssignedStaffName(selectedCase)}</strong>
                            <span>
                              {currentAssignedStaff
                                ? `${currentAssignedStaff.specialization} / ${currentAssignedStaff.zone} / ${currentAssignedStaff.currentCaseCount} active cases / ${currentAssignedStaff.isBusy ? "busy" : "available"}`
                                : "Assign staff before requesting delegation."}
                            </span>
                          </button>
                        </label>
                        <label>
                          <span>Cover type</span>
                          <select value={delegationType} onChange={(event) => setDelegationType(event.target.value)}>
                            {delegationTypeOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>To</span>
                          <select value={delegationTargetStaffId} onChange={(event) => handleDelegationTargetStaffChange(event.target.value)}>
                            <option value="">
                              {delegationStaffOptions.length ? "Select target staff" : "No department staff available"}
                            </option>
                            {delegationStaffOptions.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label>
                        <span>Reason</span>
                        <textarea value={delegationReason} onChange={(event) => setDelegationReason(event.target.value)} />
                      </label>
                      <button
                        aria-controls="staff-insight-canvas"
                        aria-expanded={inspectedStaffId === selectedDelegationTargetStaff?.id}
                        className="canvas-action-summary staff-summary-button"
                        disabled={!selectedDelegationTargetStaff}
                        onClick={() => setInspectedStaffId(selectedDelegationTargetStaff?.id ?? "")}
                        type="button"
                      >
                        <strong>{selectedDelegationTargetStaff?.name ?? "Target staff pending"}</strong>
                        <span>
                          {selectedDelegationTargetStaff
                            ? `${selectedDelegationTargetStaff.specialization} / ${selectedDelegationTargetStaff.zone} / ${selectedDelegationTargetStaff.currentCaseCount} active cases / ${selectedDelegationTargetStaff.isBusy ? "busy" : "available"}`
                            : `Only ${selectedDepartmentLabel} staff are listed for delegation.`}
                        </span>
                      </button>
                      <button type="submit" disabled={!selectedCase.assignedStaffId || !delegationTargetStaffId || pendingCaseAction === "delegate"}>
                        {pendingCaseAction === "delegate" ? "Requesting..." : "Request delegation"}
                      </button>
                    </form>
                  </article>
                )}

                {selectedCase && canvasFocus === "escalate" && (
                  <article className="canvas-overlay action-canvas-panel escalation-canvas-panel">
                    <header>
                      <span>Escalation Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>{formatSeverityLabel(selectedCase.severity)} Priority</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="canvas-action-form" onSubmit={handleEscalationSubmit}>
                      <label>
                        <span>Escalation level</span>
                        <select value={escalationLevel} onChange={(event) => setEscalationLevel(event.target.value)}>
                          <option>Department Lead</option>
                          <option>Urgent Review</option>
                          <option>Critical</option>
                        </select>
                      </label>
                      <label>
                        <span>Reason</span>
                        <textarea value={escalationReason} onChange={(event) => setEscalationReason(event.target.value)} />
                      </label>
                      <label className="canvas-checkbox-line">
                        <input type="checkbox" checked={notifyLead} onChange={(event) => setNotifyLead(event.target.checked)} />
                        <span>Notify department lead</span>
                      </label>
                      <button className="danger-button" type="submit" disabled={pendingCaseAction === "escalate"}>
                        {pendingCaseAction === "escalate" ? "Escalating..." : "Escalate case"}
                      </button>
                    </form>
                  </article>
                )}

                {selectedCase && canvasFocus === "complete" && (
                  <article className="canvas-overlay action-canvas-panel completion-canvas-panel">
                    <header>
                      <span>Completion Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>{getCaseDisplayCode(selectedCase)}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="canvas-action-form" onSubmit={handleCompleteCase}>
                      <label>
                        <span>Completion note</span>
                        <textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} />
                      </label>
                      <label>
                        <span>Prescription / Solution</span>
                        <textarea value={completionPrescription} onChange={(event) => setCompletionPrescription(event.target.value)} />
                      </label>
                      <div className="canvas-action-summary">
                        <strong>{isClosedCase(selectedCase) ? "Case already closed" : "Ready to close"}</strong>
                        <span>{getPatientName(selectedCase)} / {formatDepartment(getDepartment(selectedCase))}</span>
                      </div>
                      <button
                        className="complete-case-button"
                        disabled={isClosedCase(selectedCase) || pendingCaseAction === "complete"}
                        type="submit"
                      >
                        {pendingCaseAction === "complete" ? "Completing..." : "Confirm completion"}
                      </button>
                    </form>
                  </article>
                )}

                {selectedCase && canvasFocus === "cancel" && (
                  <article className="canvas-overlay action-canvas-panel cancellation-canvas-panel">
                    <header>
                      <span>Cancel Case Canvas</span>
                      <div className="canvas-header-actions">
                        <strong>{getCaseDisplayCode(selectedCase)}</strong>
                        <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                      </div>
                    </header>
                    <form className="canvas-action-form" onSubmit={handleCancelCase}>
                      <label>
                        <span>Cancellation note</span>
                        <textarea value={cancellationNotes} onChange={(event) => setCancellationNotes(event.target.value)} />
                      </label>
                      <div className="canvas-action-summary">
                        <strong>{isCancelledStatus(selectedCase.status) ? "Already cancelled" : "Ready to cancel"}</strong>
                        <span>{getPatientName(selectedCase)} / {formatDepartment(getDepartment(selectedCase))}</span>
                      </div>
                      <button
                        className="danger-button cancel-case-button"
                        disabled={isClosedCase(selectedCase) || pendingCaseAction === "cancel"}
                        type="submit"
                      >
                        {pendingCaseAction === "cancel" ? "Cancelling..." : "Confirm cancellation"}
                      </button>
                    </form>
                  </article>
                )}
              </div>

              <div className="map-toolbar">
                {[
                  { id: "3d", label: "3D" },
                  { id: "fit", label: "2D" }
                ].map((item) => (
                  <button
                    aria-pressed={mapView === item.id}
                    className={mapView === item.id ? "active" : ""}
                    key={item.id}
                    onClick={() => setMapView(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <aside className="case-detail-panel">
              {selectedCase ? (
                <>
                  <button
                    className="open-case-button"
                    data-canvas-toggle="true"
                    onClick={() => setCanvasFocus(canvasFocus === "new-case" ? "overview" : "new-case")}
                    type="button"
                  >
                    Open New Case
                  </button>

                  <button
                    className="detail-header detail-profile-button"
                    data-canvas-toggle="true"
                    onClick={() => setCanvasFocus(canvasFocus === "patient-profile" ? "overview" : "patient-profile")}
                    type="button"
                  >
                    <div className="case-avatar large">{formatSeverityLabel(selectedCase.severity).slice(0, 1)}</div>
                    <div>
                      <h2>{getCaseDisplayCode(selectedCase)}</h2>
                      <p className="case-identity-lines">
                        <span><strong>Patient:</strong> {getPatientName(selectedCase)}</span>
                        <span><strong>Department:</strong> {formatDepartment(getDepartment(selectedCase))}</span>
                      </p>
                      <p className="patient-symptoms-profile">
                        <strong>Description:</strong> {getSymptomsSummary(selectedCase)}
                      </p>
                      {shouldShowPrescription(selectedCase) && (
                        <p className="patient-symptoms-profile">
                          <strong>Prescription / Solution:</strong> {getProfileValue(getPrescription(selectedCase))}
                        </p>
                      )}
                      {shouldShowCancellationReason(selectedCase) && (
                        <p className="patient-symptoms-profile">
                          <strong>Cancellation reason:</strong> {getProfileValue(getCancellationReason(selectedCase))}
                        </p>
                      )}
                    </div>
                  </button>

                  <section className="activity-panel">
                    <div className="activity-panel-header">
                      <h3>Case Activity</h3>
                    </div>
                    {selectedCaseTimeline.map((item) => (
                      <div className="activity-item" key={item.id}>
                        <span className={`activity-dot dot-${item.tone}`} />
                        <p>
                          <strong>
                            {item.title}
                            {item.severity && (
                              <span className={`timeline-severity severity-${item.severityTone ?? item.tone}`}>
                                {item.severity}
                              </span>
                            )}
                          </strong>
                          <span>{item.detail}</span>
                          <small>{item.time}</small>
                        </p>
                      </div>
                    ))}
                  </section>

                  <section className="case-command-panel">
                    <p className="case-command-hint">Click To View</p>
                    <div className="case-command-tabs" role="tablist" aria-label="Case workflow actions">
                      {[
                        { id: "assign", label: "Assign" },
                        { id: "delegate", label: "Delegate" },
                        { id: "escalate", label: "Escalate" }
                      ].map((item) => (
                        <button
                          aria-pressed={actionMode === item.id}
                          className={actionMode === item.id ? "active" : ""}
                          key={item.id}
                          data-canvas-toggle="true"
                          onClick={() => handleActionModeSelect(item.id)}
                          type="button"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <dl className="detail-stats">
                    <div className={canvasFocus === "eta" ? "active" : ""}>
                      <button className="detail-stat-button" data-canvas-toggle="true" type="button" onClick={() => setCanvasFocus(canvasFocus === "eta" ? "overview" : "eta")}>
                        <span>Patient Status</span>
                        <strong>{getPatientStatus(selectedCase)}</strong>
                      </button>
                    </div>
                    <div className={canvasFocus === "staff" ? "active" : ""}>
                      <button className="detail-stat-button" data-canvas-toggle="true" type="button" onClick={() => setCanvasFocus(canvasFocus === "staff" ? "overview" : "staff")}>
                        <span>Staff</span>
                        <strong>{getAssignedStaffName(selectedCase)}</strong>
                      </button>
                    </div>
                    <div className={canvasFocus === "status" ? "active" : ""}>
                      <button className="detail-stat-button" data-canvas-toggle="true" type="button" onClick={() => setCanvasFocus(canvasFocus === "status" ? "overview" : "status")}>
                        <span>Case Status</span>
                        <strong>{selectedCase.status}</strong>
                      </button>
                    </div>
                  </dl>

                  <section className="completion-panel">
                    <button
                      className="complete-case-button"
                      data-canvas-toggle="true"
                      disabled={isClosedCase(selectedCase) || pendingCaseAction === "complete"}
                      onClick={() => setCanvasFocus(canvasFocus === "complete" ? "overview" : "complete")}
                      type="button"
                    >
                      {pendingCaseAction === "complete" ? "Completing..." : "Mark case completed"}
                    </button>
                    <button
                      className="danger-button cancel-case-button"
                      data-canvas-toggle="true"
                      disabled={isClosedCase(selectedCase) || pendingCaseAction === "cancel"}
                      onClick={() => setCanvasFocus(canvasFocus === "cancel" ? "overview" : "cancel")}
                      type="button"
                    >
                      {pendingCaseAction === "cancel" ? "Cancelling..." : "Cancel case"}
                    </button>
                  </section>

                </>
              ) : (
                <div className="empty-state">No active case selected.</div>
              )}
            </aside>
          </section>
        )}

        <section className="case-list" aria-live="polite">
          {activeRail === "staff" && (
            <section className="staff-workload-panel" aria-label="Staff workload directory">
              <header className="staff-directory-header">
                <div>
                  <span>Staff</span>
                  <h2>Workload and capability directory</h2>
                </div>
                <small>{filteredStaffDirectory.length} staff members</small>
              </header>
              <div className="staff-filters">
                <label>
                  <span>Staff name</span>
                  <input
                    list="staff-name-options"
                    placeholder="Search staff"
                    value={staffNameFilter}
                    onChange={(event) => setStaffNameFilter(event.target.value)}
                  />
                  <datalist id="staff-name-options">
                    {staffDirectory.map((member) => (
                      <option key={member.id} value={member.name} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>Role</span>
                  <select value={staffRoleFilter} onChange={(event) => setStaffRoleFilter(event.target.value)}>
                    {staffRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Department</span>
                  <select value={staffDepartmentFilter} onChange={(event) => setStaffDepartmentFilter(event.target.value)}>
                    <option value="all">All departments</option>
                    {[...new Set(staffDirectory.map((member) => getStaffDepartment(member)))].sort().map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select value={staffStatusFilter} onChange={(event) => setStaffStatusFilter(event.target.value)}>
                    {staffStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="staff-workload-layout">
                <div className="staff-table-wrap">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Active Cases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStaffDirectory.map((member) => (
                        <tr
                          className={selectedStaff?.id === member.id ? "selected" : ""}
                          key={member.id}
                          onClick={() => setSelectedStaffId(member.id)}
                          tabIndex={0}
                        >
                          <td>{member.staffCode}</td>
                          <td>{member.name}</td>
                          <td>{getStaffRole(member)}</td>
                          <td>{getStaffDepartment(member)}</td>
                          <td><span className={`staff-status-pill status-${getStaffStatus(member).toLowerCase()}`}>{getStaffStatus(member)}</span></td>
                          <td>{member.currentCaseCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredStaffDirectory.length === 0 && <div className="records-empty">No staff match the current filters.</div>}
                  <footer className="records-footer">
                    <span>
                      Showing {filteredStaffDirectory.length === 0 ? 0 : (staffPage - 1) * staffPageSize + 1}
                      -{Math.min(staffPage * staffPageSize, filteredStaffDirectory.length)} of {filteredStaffDirectory.length} staff
                    </span>
                    <div>
                      <button className="secondary-button" type="button" disabled={staffPage === 1} onClick={() => setStaffPage((page) => Math.max(1, page - 1))}>Previous</button>
                      <button className="secondary-button" type="button" disabled={staffPage === staffTotalPages} onClick={() => setStaffPage((page) => Math.min(staffTotalPages, page + 1))}>Next</button>
                    </div>
                  </footer>
                </div>
                {selectedStaff && (
                  <aside className="staff-workload-profile">
                    <header>
                      <div>
                        <h3>{selectedStaff.name}</h3>
                        <span>{getStaffRole(selectedStaff)} / {getStaffDepartment(selectedStaff)}</span>
                      </div>
                      <span className={`staff-status-pill status-${getStaffStatus(selectedStaff).toLowerCase()}`}>Status: {getStaffStatus(selectedStaff)}</span>
                    </header>
                    <div className="staff-summary-strip">
                      <div><span>Active Cases</span><strong>{selectedStaffCases.active.length}</strong></div>
                      <div><span>Avg Handling Time</span><strong>{selectedStaffStats.averageHandlingTime}</strong></div>
                      <div><span>Total Cases Handled</span><strong>{selectedStaffCases.active.length + selectedStaffCases.previous.length}</strong></div>
                      <div><span>Total Hours</span><strong>{selectedStaff.totalHoursWorked}h</strong></div>
                    </div>
                    <section>
                      <h4>Active Cases</h4>
                      <div className="staff-case-list">
                        {selectedStaffCases.active.length > 0 ? selectedStaffCases.active.map((incident) => (
                          <button
                            data-canvas-toggle="true"
                            key={getCaseId(incident)}
                            onClick={() => { selectCase(incident); setCanvasFocus("staff-active-case"); }}
                            type="button"
                          >
                            <span>{getCaseDisplayCode(incident)} / {getPatientName(incident)}</span>
                            <strong>{formatSeverityLabel(incident.severity)}</strong>
                          </button>
                        )) : <div className="pipeline-empty">No active cases assigned.</div>}
                      </div>
                    </section>
                    <section>
                      <h4>Case History</h4>
                      <div className="staff-case-list history-scroll">
                        {selectedStaffCases.previous.length > 0 ? selectedStaffCases.previous.map((incident) => (
                          <button data-canvas-toggle="true" key={getCaseId(incident)} onClick={() => openCaseSummaryCanvas(incident)} type="button">
                            <span>{getCaseDisplayCode(incident)} / {incident.status}</span>
                            <strong>{formatDepartment(getDepartment(incident))}</strong>
                          </button>
                        )) : <div className="pipeline-empty">No completed case history.</div>}
                      </div>
                    </section>
                    <section className="directory-info-block">
                      <h4>Staff Details</h4>
                      <button className="secondary-button directory-edit-button" data-canvas-toggle="true" type="button" onClick={() => openStaffProfileEditCanvas(selectedStaff)}>
                        Edit personal/contact
                      </button>
                      <dl>
                        <div><dt>Email</dt><dd>{getProfileValue(selectedStaff.emailAddress)}</dd></div>
                        <div><dt>Phone</dt><dd>{maskPhone(selectedStaff.phoneNumber ?? selectedStaff.phone)}</dd></div>
                        <div><dt>Current location</dt><dd>{selectedStaff.zone}</dd></div>
                        <div><dt>Cooldown</dt><dd>{selectedStaff.cooldownUntil ? formatCompactDateTime(selectedStaff.cooldownUntil) : "Clear"}</dd></div>
                      </dl>
                    </section>
                  </aside>
                )}
              </div>
              {selectedStaff && canvasFocus === "staff-directory-edit" && (
                <article className="canvas-overlay action-canvas-panel directory-edit-canvas">
                  <header>
                    <span>Staff Details</span>
                    <div className="canvas-header-actions">
                      <strong>{selectedStaff.name}</strong>
                      <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                    </div>
                  </header>
                  <form className="canvas-action-form" onSubmit={handleStaffProfileSubmit}>
                    <label>
                      <span>Full name</span>
                      <input value={staffProfileForm.name} onChange={(event) => updateStaffProfileForm("name", event.target.value)} />
                    </label>
                    <label>
                      <span>Role / specialization</span>
                      <input value={staffProfileForm.specialization} onChange={(event) => updateStaffProfileForm("specialization", event.target.value)} />
                    </label>
                    <div className="canvas-action-grid">
                      <label>
                        <span>Email</span>
                        <input type="email" value={staffProfileForm.emailAddress} onChange={(event) => updateStaffProfileForm("emailAddress", event.target.value)} />
                      </label>
                      <label>
                        <span>Phone</span>
                        <input value={staffProfileForm.phoneNumber} onChange={(event) => updateStaffProfileForm("phoneNumber", event.target.value)} />
                      </label>
                    </div>
                    <button className="primary-action-button" disabled={pendingCaseAction === "staff-directory-edit"} type="submit">
                      {pendingCaseAction === "staff-directory-edit" ? "Updating..." : "Update staff details"}
                    </button>
                  </form>
                </article>
              )}
              {selectedCase && canvasFocus === "staff-active-case" && (
                <article className="canvas-overlay staff-case-canvas">
                  <header>
                    <span>Active Case</span>
                    <div className="canvas-header-actions">
                      <strong>{getCaseDisplayCode(selectedCase)}</strong>
                      <button className="canvas-close-button" onClick={closeCanvas} type="button" aria-label="Close canvas">X</button>
                    </div>
                  </header>
                  <div className="staff-case-canvas-summary">
                    <div><span>Patient</span><strong>{getPatientName(selectedCase)}</strong></div>
                    <div><span>Priority</span><strong>{formatSeverityLabel(selectedCase.severity)}</strong></div>
                    <div><span>Department</span><strong>{formatDepartment(getDepartment(selectedCase))}</strong></div>
                    <div><span>Case status</span><strong>{selectedCase.status}</strong></div>
                    <div><span>Patient status</span><strong>{getPatientStatus(selectedCase)}</strong></div>
                    <div><span>Assigned</span><strong>{getAssignedStaffName(selectedCase)}</strong></div>
                  </div>
                  <section className="staff-case-canvas-section">
                    <h4>Clinical Summary</h4>
                    <p>{getSymptomsSummary(selectedCase)}</p>
                  </section>
                  <section className="staff-case-canvas-section">
                    <h4>Vitals</h4>
                    <dl>
                      <div><dt>Blood pressure</dt><dd>{getVitalValue(selectedCase, "bloodPressure", /BP\s+([^;.]+)/i)}</dd></div>
                      <div><dt>Heart rate</dt><dd>{getVitalValue(selectedCase, "heartRate", /HR\s+(\d+)/i, " bpm")}</dd></div>
                      <div><dt>Oxygen saturation</dt><dd>{getVitalValue(selectedCase, "oxygenSaturation", /O2\s+(\d+)%/i, "%")}</dd></div>
                    </dl>
                  </section>
                  {shouldShowPrescription(selectedCase) && (
                    <section className="staff-case-canvas-section">
                      <h4>Prescription / Solution</h4>
                      <p>{getProfileValue(getPrescription(selectedCase))}</p>
                    </section>
                  )}
                  {shouldShowCancellationReason(selectedCase) && (
                    <section className="staff-case-canvas-section">
                      <h4>Cancellation Reason</h4>
                      <p>{getProfileValue(getCancellationReason(selectedCase))}</p>
                    </section>
                  )}
                  <footer className="staff-case-canvas-actions">
                    <button className="secondary-button" type="button" onClick={() => { setActiveRail("assignment"); setCanvasFocus("overview"); }}>Open Case Record</button>
                  </footer>
                </article>
              )}
            </section>
          )}

          {activeRail !== "staff" && activeRail !== "patients" && activeRail !== "analytics" && isLoading && <div className="panel empty-state">Loading cases...</div>}
          {activeRail !== "staff" && activeRail !== "patients" && activeRail !== "analytics" && !isLoading && cases.length === 0 && <div className="panel empty-state">No active cases found.</div>}
          {activeRail !== "staff" && activeRail !== "patients" && activeRail !== "analytics" && !isLoading && cases.length > 0 && filteredCases.length === 0 && (
            <div className="panel empty-state">No cases match this view.</div>
          )}
        </section>
      </section>
    </main>
  );
}
