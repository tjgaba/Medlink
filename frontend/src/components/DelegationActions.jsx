import { useState } from "react";
import {
  acceptDelegation,
  declineDelegation,
  requestDelegation
} from "../services/casesService.js";
import { getCaseId } from "../utils/caseFormatters.js";

export function DelegationActions({ incident, user, onUpdated }) {
  const [pendingAction, setPendingAction] = useState("");
  const caseId = getCaseId(incident);
  const pendingDelegationId = incident.pendingDelegationId ?? incident.delegationRequestId;

  async function handleRequestDelegation() {
    const toStaffId = window.prompt("Target staff ID");

    if (!toStaffId) {
      return;
    }

    try {
      setPendingAction("request");
      await requestDelegation({
        fromStaffId: incident.assignedStaffId ?? user?.id,
        toStaffId,
        caseId,
        type: "Short",
        reason: "Dashboard delegation request"
      });

      window.dispatchEvent(
        new CustomEvent("app:notice", {
          detail: { message: "Delegation requested.", type: "success" }
        })
      );
      onUpdated();
    } finally {
      setPendingAction("");
    }
  }

  async function handleAccept() {
    try {
      setPendingAction("accept");
      await acceptDelegation(pendingDelegationId);
      window.dispatchEvent(
        new CustomEvent("app:notice", {
          detail: { message: "Delegation accepted.", type: "success" }
        })
      );
      onUpdated();
    } finally {
      setPendingAction("");
    }
  }

  async function handleDecline() {
    try {
      setPendingAction("decline");
      await declineDelegation(pendingDelegationId);
      window.dispatchEvent(
        new CustomEvent("app:notice", {
          detail: { message: "Delegation declined.", type: "info" }
        })
      );
      onUpdated();
    } finally {
      setPendingAction("");
    }
  }

  return (
    <div className="case-actions">
      <button type="button" onClick={handleRequestDelegation} disabled={Boolean(pendingAction)}>
        {pendingAction === "request" ? "Requesting..." : "Request delegation"}
      </button>
      {pendingDelegationId && (
        <>
          <button type="button" className="secondary-button" onClick={handleAccept} disabled={Boolean(pendingAction)}>
            {pendingAction === "accept" ? "Accepting..." : "Accept"}
          </button>
          <button type="button" className="danger-button" onClick={handleDecline} disabled={Boolean(pendingAction)}>
            {pendingAction === "decline" ? "Declining..." : "Decline"}
          </button>
        </>
      )}
    </div>
  );
}
