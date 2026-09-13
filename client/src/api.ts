// When the frontend is deployed separately from the API (e.g. a Render
// static site talking to a Render web service on another domain), set
// VITE_API_BASE_URL at build time. Left empty, requests stay same-origin
// (used by the Vite dev proxy and same-origin deployments).
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export interface VideoMeta {
  id: string;
  title: string;
  thumbnail: string;
  durationSeconds: number;
}

export type OutputFormat = "mp3" | "mp4";

export type JobStatus = "queued" | "fetching" | "converting" | "done" | "error";

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress: number;
  meta: VideoMeta | null;
  format: OutputFormat;
  quality: string;
  error: string | null;
  downloadReady: boolean;
  fileSizeBytes: number | null;
  fileName: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore parse errors, fall through to generic message
  }
  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export async function fetchVideoInfo(url: string): Promise<VideoMeta> {
  const res = await fetch(`${API_BASE}/api/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await parseJsonOrThrow<{ video: VideoMeta }>(res);
  return data.video;
}

export async function startConversion(params: {
  url: string;
  format: OutputFormat;
  audioQuality?: string;
  videoQuality?: string;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await parseJsonOrThrow<{ jobId: string }>(res);
  return data.jobId;
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/api/convert/${jobId}`);
  return parseJsonOrThrow<JobStatusResponse>(res);
}

export function downloadUrl(jobId: string): string {
  return `${API_BASE}/api/convert/${jobId}/download`;
}
