import fs from "node:fs/promises";
import { collectExpiredJobs, deleteJob } from "./jobs.js";

const SWEEP_INTERVAL_MS = 60 * 1000;

async function sweepOnce(): Promise<void> {
  for (const job of collectExpiredJobs()) {
    if (job.filePath) {
      await fs.rm(job.filePath, { force: true }).catch(() => {});
    }
    deleteJob(job.id);
  }
}

export function startCleanupSweeper(): NodeJS.Timeout {
  return setInterval(() => {
    sweepOnce().catch((err) => console.error("cleanup sweep failed", err));
  }, SWEEP_INTERVAL_MS);
}
