import { DelegationActions } from "./DelegationActions.jsx";
import { StatusBadge } from "./StatusBadge.jsx";
import {
  formatDepartment,
  getAssignedStaffName,
  getCaseDisplayCode,
  getDepartment,
  getPatientStatus,
  getSymptomsSummary,
  getZoneName,
  normalizeSeverity
} from "../utils/caseFormatters.js";

export function CaseCard({ incident, user, onUpdated, onSelect, isSelected, isRecentlyUpdated }) {
  const severity = normalizeSeverity(incident.severity).toLowerCase();

  return (
    <article className={`case-card severity-card-${severity} ${isSelected ? "selected" : ""} ${isRecentlyUpdated ? "case-updated" : ""}`}>
      <div className="case-card-header">
        <div>
          <span className="case-id">{getCaseDisplayCode(incident)}</span>
          <h2>{getZoneName(incident)}</h2>
        </div>
        <div className="case-header-actions">
          <StatusBadge severity={incident.severity} />
          <button className="case-view-button secondary-button" type="button" onClick={onSelect}>
            View
          </button>
        </div>
      </div>

      <dl className="case-meta">
        <div>
          <dt>Patient status</dt>
          <dd>{getPatientStatus(incident)}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{formatDepartment(getDepartment(incident))}</dd>
        </div>
        <div>
          <dt>Assigned staff</dt>
          <dd>{getAssignedStaffName(incident)}</dd>
        </div>
        <div>
          <dt>Case status</dt>
          <dd>{incident.status ?? "Pending"}</dd>
        </div>
      </dl>

      <p className="symptoms-summary">{getSymptomsSummary(incident)}</p>

      <DelegationActions incident={incident} user={user} onUpdated={onUpdated} />
    </article>
  );
}
