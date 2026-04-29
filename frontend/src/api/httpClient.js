import axios from "axios";
import {
  canQueueRequest,
  enqueueOfflineRequest,
  flushOfflineQueue
} from "../resilience/offlineQueue.js";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5043/api",
  timeout: 10000
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!navigator.onLine && canQueueRequest(config) && !config.skipOfflineQueue) {
    enqueueOfflineRequest(config);
    return Promise.reject({
      isOfflineQueued: true,
      message: "Request queued offline"
    });
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.isOfflineQueued) {
      window.dispatchEvent(
        new CustomEvent("app:error", {
          detail: {
            message: "Saved offline. It will sync when network returns.",
            statusCode: 0
          }
        })
      );

      return Promise.reject(error);
    }

    if (!error.response && error.config && canQueueRequest(error.config) && !error.config.skipOfflineQueue) {
      enqueueOfflineRequest(error.config);
      window.dispatchEvent(
        new CustomEvent("app:error", {
          detail: {
            message: "Network unavailable. Request saved for sync.",
            statusCode: 0
          }
        })
      );

      return Promise.reject(error);
    }

    const message = error.response?.data?.message ?? "Network unavailable";

    window.dispatchEvent(
      new CustomEvent("app:error", {
        detail: {
          message,
          statusCode: error.response?.status ?? 0
        }
      })
    );

    return Promise.reject(error);
  }
);

window.addEventListener("online", () => {
  void flushOfflineQueue(httpClient);
});

if (navigator.onLine) {
  void flushOfflineQueue(httpClient);
}
