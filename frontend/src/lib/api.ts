export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Server: call Django directly (API_URL, the Service URL in k8s).
// Browser: stay relative so /api hits the same origin (Next rewrite in dev, Gateway in k8s).
function baseUrl(): string {
  return typeof window === "undefined" ? (process.env.API_URL ?? "http://localhost:8000") : "";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}/api${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? "GET"} /api${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}
