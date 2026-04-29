const QUEUE_KEY = "offlineRequestQueue";
const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(
    new CustomEvent("offline-queue:changed", {
      detail: { count: queue.length }
    })
  );
}

export function getQueuedRequestCount() {
  return readQueue().length;
}

export function canQueueRequest(config) {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  return MUTATION_METHODS.has(method) && !url.includes("/auth/");
}

export function enqueueOfflineRequest(config) {
  const queue = readQueue();
  const request = {
    id: crypto.randomUUID(),
    url: config.url,
    method: config.method,
    data: config.data,
    headers: config.headers,
    queuedAt: new Date().toISOString()
  };

  writeQueue([...queue, request]);
  return request;
}

export async function flushOfflineQueue(httpClient) {
  if (!navigator.onLine) {
    return;
  }

  const queue = readQueue();
  const remaining = [];

  for (const request of queue) {
    try {
      await httpClient.request({
        url: request.url,
        method: request.method,
        data: request.data,
        headers: request.headers,
        skipOfflineQueue: true
      });
    } catch {
      remaining.push(request);
    }
  }

  writeQueue(remaining);
}
