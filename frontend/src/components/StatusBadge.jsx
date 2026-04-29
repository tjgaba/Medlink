import { formatSeverityLabel, normalizeSeverity } from "../utils/caseFormatters.js";

export function StatusBadge({ severity }) {
  const normalizedSeverity = normalizeSeverity(severity);

  return (
    <span className={`severity-badge severity-${normalizedSeverity.toLowerCase()}`}>
      {formatSeverityLabel(severity)}
    </span>
  );
}
