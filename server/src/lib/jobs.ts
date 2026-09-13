import { nanoid } from "nanoid";

export type JobStatus =
  | "queued"
  | "fetching"
  | "converting"
  | "done"
  | "error";

export interface VideoMeta {
  id: string;
  title: string;
  thumbnail: string;
  durationSeconds: number;
}

export interface ConversionJob {
  id: string;
  videoId: string;
  format: "mp3" | "mp4";
  quality: string;
  status: JobStatus;
  progress: number; // 0-100
  meta: VideoMeta | null;
  filePath: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  error: string | null;
  createdAt: number;
  expiresAt: number | null;
}

const jobs = new Map<string, ConversionJob>();

const JOB_TTL_AFTER_COMPLETE_MS = 15 * 60 * 1000; // 15 minutes
const JOB_MAX_AGE_MS = 60 * 60 * 1000; // hard ceiling for any job record

export function createJob(
  videoId: string,
  format: "mp3" | "mp4",
  quality: string,
): ConversionJob {
  const job: ConversionJob = {
    id: nanoid(12),
    videoId,
    format,
    quality,
    status: "queued",
    progress: 0,
    meta: null,
    filePath: null,
    fileName: null,
    fileSizeBytes: null,
    error: null,
    createdAt: Date.now(),
    expiresAt: null,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): ConversionJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<ConversionJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
  if (job.status === "done" || job.status === "error") {
    job.expiresAt = Date.now() + JOB_TTL_AFTER_COMPLETE_MS;
  }
}

export function deleteJob(id: string): void {
  jobs.delete(id);
}

export function allJobs(): ConversionJob[] {
  return Array.from(jobs.values());
}

/** Returns jobs whose files should be purged now: either past their
 * post-completion TTL, or simply too old regardless of status (stuck jobs). */
export function collectExpiredJobs(): ConversionJob[] {
  const now = Date.now();
  return allJobs().filter(
    (job) =>
      (job.expiresAt !== null && now >= job.expiresAt) ||
      now - job.createdAt >= JOB_MAX_AGE_MS,
  );
}
