import { httpClient } from "./api.js";

export async function getCases() {
  const response = await httpClient.get("/cases");
  return response.data;
}

export async function getStaff() {
  const response = await httpClient.get("/staff");
  return response.data;
}

export async function updateStaffProfile(staffId, payload) {
  const response = await httpClient.put(`/staff/${staffId}`, payload);
  return response.data;
}

export async function createCase(payload) {
  const response = await httpClient.post("/cases", payload);
  return response.data;
}

export async function updateCasePatientProfile(caseId, payload) {
  const response = await httpClient.put(`/cases/${caseId}/patient-profile`, payload);
  return response.data;
}

export async function assignCase({ caseId, staffId, notes }) {
  const response = await httpClient.post(`/cases/${caseId}/assign`, {
    staffId,
    notes
  });

  return response.data;
}

export async function unassignCase(caseId) {
  const response = await httpClient.post(`/cases/${caseId}/unassign`);
  return response.data;
}

export async function completeCase({ caseId, notes, prescription }) {
  const response = await httpClient.post(`/cases/${caseId}/complete`, {
    notes,
    prescription
  });

  return response.data;
}

export async function cancelCase({ caseId, notes }) {
  const response = await httpClient.post(`/cases/${caseId}/cancel`, {
    notes
  });

  return response.data;
}

export async function escalateCase({ caseId, level, reason, notifyDepartmentLead }) {
  const response = await httpClient.post(`/cases/${caseId}/escalate`, {
    level,
    reason,
    notifyDepartmentLead
  }, {
    timeout: 30000
  });

  const responseCase = response.data?.case ?? response.data?.Case;
  const notificationWarning = response.data?.notificationWarning ?? response.data?.NotificationWarning;

  return responseCase
    ? { ...responseCase, notificationWarning }
    : response.data;
}

export async function requestDelegation({ fromStaffId, toStaffId, caseId, type, reason }) {
  const response = await httpClient.post("/delegation", {
    fromStaffId,
    toStaffId,
    caseId,
    type,
    reason
  });

  return response.data;
}

export async function acceptDelegation(requestId) {
  await httpClient.post(`/delegation/${requestId}/accept`);
}

export async function declineDelegation(requestId) {
  await httpClient.post(`/delegation/${requestId}/decline`);
}
