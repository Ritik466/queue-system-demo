const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function getQueueStatus() {
  const res = await fetch(`${API_BASE}/queue/status`);
  if (!res.ok) throw new Error("Failed to fetch queue status");
  return res.json();
}

export async function joinQueue() {
  const res = await fetch(`${API_BASE}/queue/join`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to join queue");
  return res.json();
}

export async function serveNext() {
  const res = await fetch(`${API_BASE}/queue/serve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to serve next");
  return res.json();
}
