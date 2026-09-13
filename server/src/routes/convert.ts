import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import {
  extractVideoId,
  isAudioQuality,
  isOutputFormat,
  isVideoQuality,
} from "../lib/validate.js";
import { createJob, getJob, updateJob } from "../lib/jobs.js";
import { convertVideo, fetchVideoInfo, YtDlpError } from "../lib/ytdlp.js";
import { convertLimiter, statusLimiter } from "../middleware/rateLimit.js";

export const convertRouter = Router();

const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), "storage");

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB ceiling per file

convertRouter.post("/convert", convertLimiter, async (req, res) => {
  const { url, format, audioQuality, videoQuality } = req.body ?? {};

  if (typeof url !== "string") {
    return res.status(400).json({ error: "Please provide a YouTube URL." });
  }
  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "That doesn't look like a valid YouTube video URL." });
  }
  if (!isOutputFormat(format)) {
    return res.status(400).json({ error: "Please choose MP3 or MP4." });
  }
  if (format === "mp3" && audioQuality !== undefined && !isAudioQuality(audioQuality)) {
    return res.status(400).json({ error: "Unsupported audio quality." });
  }
  if (format === "mp4" && videoQuality !== undefined && !isVideoQuality(videoQuality)) {
    return res.status(400).json({ error: "Unsupported video quality." });
  }

  const job = createJob(videoId, format, format === "mp3" ? audioQuality ?? "192" : videoQuality ?? "720");
  res.status(202).json({ jobId: job.id });

  // Run the conversion in the background; the client polls job status.
  void runJob(job.id, {
    videoId,
    format,
    audioQuality: audioQuality ?? "192",
    videoQuality: videoQuality ?? "720",
  });
});

async function runJob(
  jobId: string,
  opts: { videoId: string; format: "mp3" | "mp4"; audioQuality: string; videoQuality: string },
) {
  try {
    updateJob(jobId, { status: "fetching" });
    const meta = await fetchVideoInfo(opts.videoId);
    updateJob(jobId, { meta, status: "converting", progress: 1 });

    const result = await convertVideo({
      videoId: opts.videoId,
      format: opts.format,
      audioBitrateKbps: opts.audioQuality,
      videoHeight: opts.videoQuality,
      outputDir: STORAGE_DIR,
      jobId,
      onProgress: (percent) => updateJob(jobId, { progress: percent }),
    });

    if (result.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      await fs.promises.rm(result.filePath, { force: true });
      updateJob(jobId, {
        status: "error",
        error: "The converted file exceeds the 500 MB size limit.",
      });
      return;
    }

    const titleSlug = (meta.title || "convertly")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .slice(0, 60)
      .replace(/\s+/g, "-") || "convertly";

    updateJob(jobId, {
      status: "done",
      progress: 100,
      filePath: result.filePath,
      fileName: `${titleSlug}.${opts.format}`,
      fileSizeBytes: result.fileSizeBytes,
    });
  } catch (err) {
    const message =
      err instanceof YtDlpError
        ? err.message
        : "Conversion failed unexpectedly. Please try again.";
    updateJob(jobId, { status: "error", error: message });
  }
}

convertRouter.get("/convert/:jobId", statusLimiter, (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "This conversion job was not found or has expired." });
  }
  return res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    meta: job.meta,
    format: job.format,
    quality: job.quality,
    error: job.error,
    downloadReady: job.status === "done",
    fileSizeBytes: job.fileSizeBytes,
    fileName: job.fileName,
  });
});

convertRouter.get("/convert/:jobId/download", statusLimiter, (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job || job.status !== "done" || !job.filePath || !job.fileName) {
    return res.status(404).json({ error: "This file is not ready or has expired." });
  }

  const resolved = path.resolve(job.filePath);
  if (!resolved.startsWith(STORAGE_DIR)) {
    return res.status(400).json({ error: "Invalid file path." });
  }

  res.download(resolved, job.fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: "Failed to download the file." });
    }
  });
});
