import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { canonicalWatchUrl } from "./validate.js";
import type { VideoMeta } from "./jobs.js";

const YTDLP_BIN = process.env.YTDLP_PATH || "yt-dlp";
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";

const INFO_TIMEOUT_MS = 45_000;
const CONVERT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes hard ceiling per job
const MAX_DURATION_SECONDS = 3 * 60 * 60; // reject anything over 3 hours

// YouTube's default "web" player client frequently returns a bare "Video
// unavailable" for requests coming from cloud/datacenter IPs (Render, AWS,
// etc.), even for perfectly public videos. Falling back through the
// android/ios clients (which don't need this extra signature check) works
// around it in most cases.
const CLIENT_FALLBACK_ARGS = ["--extractor-args", "youtube:player_client=android,ios,web"];

export class YtDlpError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface RawInfo {
  id: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  availability?: string;
  is_live?: boolean;
  age_limit?: number;
}

function runProcess(
  bin: string,
  args: string[],
  opts: { timeoutMs: number; onStderr?: (chunk: string) => void },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new YtDlpError("TIMEOUT", "The operation took too long and was cancelled."));
    }, opts.timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      opts.onStderr?.(s);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new YtDlpError("SPAWN_FAILED", `Could not start ${bin}: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new YtDlpError("PROCESS_FAILED", stderr.trim() || `${bin} exited with code ${code}`));
      }
    });
  });
}

export async function fetchVideoInfo(videoId: string): Promise<VideoMeta> {
  const url = canonicalWatchUrl(videoId);
  let stdout: string;
  try {
    const result = await runProcess(
      YTDLP_BIN,
      ["-J", "--no-playlist", "--no-warnings", "--skip-download", ...CLIENT_FALLBACK_ARGS, url],
      { timeoutMs: INFO_TIMEOUT_MS },
    );
    stdout = result.stdout;
  } catch (err) {
    if (err instanceof YtDlpError && err.code === "TIMEOUT") throw err;
    console.error("yt-dlp info lookup failed:", err instanceof Error ? err.message : err);
    throw new YtDlpError(
      "UNAVAILABLE",
      "This video is unavailable, private, age-restricted, or otherwise not accessible.",
    );
  }

  let info: RawInfo;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new YtDlpError("PARSE_ERROR", "Could not read video information.");
  }

  if (info.is_live) {
    throw new YtDlpError("UNSUPPORTED", "Live streams cannot be converted.");
  }
  if (info.availability && !["public", "unlisted"].includes(info.availability)) {
    throw new YtDlpError(
      "RESTRICTED",
      "This video is private or restricted. Convertly can only process videos you own or have permission to download.",
    );
  }
  if (typeof info.duration === "number" && info.duration > MAX_DURATION_SECONDS) {
    throw new YtDlpError("TOO_LONG", "This video exceeds the maximum supported duration of 3 hours.");
  }

  return {
    id: info.id,
    title: info.title?.trim() || "Untitled video",
    thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
    durationSeconds: info.duration ?? 0,
  };
}

export interface ConvertOptions {
  videoId: string;
  format: "mp3" | "mp4";
  audioBitrateKbps?: string; // "128" | "192" | "320"
  videoHeight?: string; // "360" | "720" | "1080"
  outputDir: string;
  jobId: string;
  onProgress?: (percent: number) => void;
}

export interface ConvertResult {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
}

const PROGRESS_RE = /\[download\]\s+([\d.]+)%/;

export async function convertVideo(opts: ConvertOptions): Promise<ConvertResult> {
  const url = canonicalWatchUrl(opts.videoId);
  await fs.mkdir(opts.outputDir, { recursive: true });

  const outTemplate = path.join(opts.outputDir, `${opts.jobId}.%(ext)s`);
  const args = [
    "--no-playlist",
    "--no-warnings",
    "-o",
    outTemplate,
    "--newline",
    "--ffmpeg-location",
    FFMPEG_BIN,
    ...CLIENT_FALLBACK_ARGS,
  ];

  if (opts.format === "mp3") {
    args.push(
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      `${opts.audioBitrateKbps ?? "192"}K`,
    );
  } else {
    const height = opts.videoHeight ?? "720";
    args.push(
      "-f",
      `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best[height<=${height}]`,
      "--merge-output-format",
      "mp4",
    );
  }
  args.push(url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(YTDLP_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new YtDlpError("TIMEOUT", "Conversion took too long and was cancelled."));
    }, CONVERT_TIMEOUT_MS);

    const handleChunk = (chunk: string) => {
      const match = PROGRESS_RE.exec(chunk);
      if (match) {
        const pct = Math.min(99, Math.round(parseFloat(match[1])));
        opts.onProgress?.(pct);
      }
    };

    child.stdout.on("data", (d) => handleChunk(d.toString()));
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      handleChunk(s);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new YtDlpError("SPAWN_FAILED", `Could not start conversion: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new YtDlpError("CONVERT_FAILED", stderr.trim() || "Conversion process failed."));
    });
  });

  const ext = opts.format;
  const finalPath = path.join(opts.outputDir, `${opts.jobId}.${ext}`);
  const stat = await fs.stat(finalPath).catch(() => null);
  if (!stat) {
    throw new YtDlpError("CONVERT_FAILED", "The converted file could not be found after processing.");
  }

  opts.onProgress?.(100);

  return {
    filePath: finalPath,
    fileName: `convertly.${ext}`,
    fileSizeBytes: stat.size,
  };
}

