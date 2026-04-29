import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCases } from "../services/casesService.js";
import {
  formatDepartment,
  formatSeverityLabel,
  getCaseDisplayCode,
  getCaseId,
  getDepartment,
  normalizeSeverity
} from "../utils/caseFormatters.js";

function upsertCase(cases, nextCase) {
  const nextCaseId = getCaseId(nextCase);
  const exists = cases.some((incident) => getCaseId(incident) === nextCaseId);

  if (!exists) {
    return [nextCase, ...cases];
  }

  return cases.map((incident) =>
    getCaseId(incident) === nextCaseId ? { ...incident, ...nextCase } : incident
  );
}

function getHubUrl() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5043/api";
  return apiBaseUrl.replace(/\/api\/?$/, "/hubs/notifications");
}

export function useCases(token) {
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState("Disconnected");
  const [recentlyUpdatedCaseIds, setRecentlyUpdatedCaseIds] = useState(new Set());

  const highlightCase = useCallback((incident) => {
    const caseId = getCaseId(incident);

    setRecentlyUpdatedCaseIds((currentIds) => new Set(currentIds).add(caseId));
    window.setTimeout(() => {
      setRecentlyUpdatedCaseIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(caseId);
        return nextIds;
      });
    }, 3000);
  }, []);

  const markCaseUpdated = useCallback((incident, message) => {
    highlightCase(incident);

    window.dispatchEvent(
      new CustomEvent("app:notice", {
        detail: {
          message,
          type: normalizeSeverity(incident.severity) === "RED" ? "critical" : "info"
        }
      })
    );
  }, [highlightCase]);

  const handleNewCaseReceived = useCallback((incident) => {
    const severity = normalizeSeverity(incident.severity);

    highlightCase(incident);
    window.dispatchEvent(
      new CustomEvent("app:new-case", {
        detail: { incident }
      })
    );

    if (severity === "ORANGE") {
      window.dispatchEvent(
        new CustomEvent("app:notice", {
          detail: {
            message: `${getCaseDisplayCode(incident)} received for ${formatDepartment(getDepartment(incident))}.`,
            type: "warning"
          }
        })
      );
    }

    if (severity === "RED") {
      window.dispatchEvent(
        new CustomEvent("app:notice", {
          detail: {
            message: `${formatSeverityLabel(incident.severity)} priority case received.`,
            type: "critical"
          }
        })
      );
    }
  }, [highlightCase]);

  const refreshCases = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextCases = await getCases();
      setCases(Array.isArray(nextCases) ? nextCases : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCases();
  }, [refreshCases]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(getHubUrl(), { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const handleCaseCreated = (incident) => {
      setCases((currentCases) => upsertCase(currentCases, incident));
      handleNewCaseReceived(incident);
    };

    connection.on("CaseCreated", handleCaseCreated);
    connection.on("NewCaseReceived", handleCaseCreated);

    connection.on("StaffAssigned", (incident) => {
      setCases((currentCases) => upsertCase(currentCases, incident));
      markCaseUpdated(incident, "Staff assignment updated.");
    });

    connection.on("DelegationRequested", (incident) => {
      setCases((currentCases) => upsertCase(currentCases, incident));
      markCaseUpdated(incident, "Delegation requested.");
    });

    connection.on("DelegationUpdated", (incident) => {
      setCases((currentCases) => upsertCase(currentCases, incident));
      markCaseUpdated(incident, "Delegation updated.");
    });

    connection.on("CaseUpdated", (incident) => {
      setCases((currentCases) => upsertCase(currentCases, incident));
      markCaseUpdated(incident, "Case details updated.");
    });

    connection.onreconnecting(() => setConnectionState("Reconnecting"));
    connection.onreconnected(() => setConnectionState("Connected"));
    connection.onclose(() => setConnectionState("Disconnected"));

    connection
      .start()
      .then(() => setConnectionState("Connected"))
      .catch(() => setConnectionState("Disconnected"));

    return () => {
      void connection.stop();
    };
  }, [handleNewCaseReceived, markCaseUpdated, token]);

  const sortedCases = useMemo(() => {
    const severityOrder = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3 };

    return [...cases].sort((left, right) => {
      const leftRank = severityOrder[normalizeSeverity(left.severity)] ?? 4;
      const rightRank = severityOrder[normalizeSeverity(right.severity)] ?? 4;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const departmentSort = getDepartment(left).localeCompare(getDepartment(right));
      if (departmentSort !== 0) {
        return departmentSort;
      }

      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }, [cases]);

  const groupedCases = useMemo(() => {
    return sortedCases.reduce((groups, incident) => {
      const groupKey = `${normalizeSeverity(incident.severity)}|${getDepartment(incident)}`;
      const existingGroup = groups.find((group) => group.key === groupKey);

      if (existingGroup) {
        existingGroup.cases.push(incident);
        return groups;
      }

      return [
        ...groups,
        {
          key: groupKey,
          severity: normalizeSeverity(incident.severity),
          department: getDepartment(incident),
          cases: [incident]
        }
      ];
    }, []);
  }, [sortedCases]);

  const severityCounts = useMemo(() => {
    return sortedCases.reduce(
      (counts, incident) => {
        const severity = normalizeSeverity(incident.severity);
        return {
          ...counts,
          [severity]: (counts[severity] ?? 0) + 1
        };
      },
      { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 }
    );
  }, [sortedCases]);

  return {
    cases: sortedCases,
    groupedCases,
    isLoading,
    connectionState,
    recentlyUpdatedCaseIds,
    severityCounts,
    refreshCases
  };
}
