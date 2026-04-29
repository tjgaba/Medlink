import { useEffect, useState } from "react";
import {
  flushOfflineQueue,
  getQueuedRequestCount
} from "./offlineQueue.js";
import { httpClient } from "../api/httpClient.js";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(getQueuedRequestCount());

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      void flushOfflineQueue(httpClient);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    function handleQueueChanged(event) {
      setQueuedCount(event.detail?.count ?? getQueuedRequestCount());
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue:changed", handleQueueChanged);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue:changed", handleQueueChanged);
    };
  }, []);

  return (
    <div className={`network-status ${isOnline ? "online" : "offline"}`}>
      {isOnline ? "Online" : "Offline"}
      {queuedCount > 0 && ` · ${queuedCount} queued`}
    </div>
  );
}
