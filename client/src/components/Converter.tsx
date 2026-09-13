import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  downloadUrl,
  fetchJobStatus,
  fetchVideoInfo,
  startConversion,
  type JobStatusResponse,
  type OutputFormat,
  type VideoMeta,
} from "../api";
import { formatDuration, formatFileSize } from "../lib/format";
import FormatToggle from "./FormatToggle";
import QualitySelector from "./QualitySelector";
import ProgressBar from "./ProgressBar";

type Stage = "input" | "looking-up" | "ready" | "converting" | "done" | "error";

const AUDIO_OPTIONS = [
  { value: "128", label: "128 kbps" },
  { value: "192", label: "192 kbps" },
  { value: "320", label: "320 kbps" },
];

const VIDEO_OPTIONS = [
  { value: "360", label: "360p" },
  { value: "720", label: "720p" },
  { value: "1080", label: "1080p" },
];

const POLL_INTERVAL_MS = 1200;

export default function Converter() {
  const [stage, setStage] = useState<Stage>("input");
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState<VideoMeta | null>(null);
  const [format, setFormat] = useState<OutputFormat>("mp3");
  const [audioQuality, setAudioQuality] = useState("192");
  const [videoQuality, setVideoQuality] = useState("720");
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatusResponse | null>(null);

  const pollRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => clearPoll, [clearPoll]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setStage("looking-up");
    try {
      const meta = await fetchVideoInfo(url.trim());
      setVideo(meta);
      setStage("ready");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStage("error");
    }
  }

  async function handleStartConversion() {
    setError(null);
    setStage("converting");
    try {
      const jobId = await startConversion({
        url: url.trim(),
        format,
        audioQuality: format === "mp3" ? audioQuality : undefined,
        videoQuality: format === "mp4" ? videoQuality : undefined,
      });
      setJob({
        id: jobId,
        status: "queued",
        progress: 0,
        meta: video,
        format,
        quality: format === "mp3" ? audioQuality : videoQuality,
        error: null,
        downloadReady: false,
        fileSizeBytes: null,
        fileName: null,
      });

      pollRef.current = window.setInterval(async () => {
        try {
          const status = await fetchJobStatus(jobId);
          setJob(status);
          if (status.status === "done") {
            clearPoll();
            setStage("done");
          } else if (status.status === "error") {
            clearPoll();
            setError(status.error ?? "Conversion failed.");
            setStage("error");
          }
        } catch (err) {
          clearPoll();
          setError(err instanceof ApiError ? err.message : "Lost connection to the server.");
          setStage("error");
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the conversion.");
      setStage("error");
    }
  }

  function handleReset() {
    clearPoll();
    setStage("input");
    setUrl("");
    setVideo(null);
    setJob(null);
    setError(null);
    setFormat("mp3");
    setAudioQuality("192");
    setVideoQuality("720");
  }

  function handleRetry() {
    clearPoll();
    setError(null);
    setStage(video ? "ready" : "input");
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {(stage === "input" || stage === "looking-up") && (
        <form onSubmit={handleLookup} className="animate-fade-in">
          <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-2 shadow-card sm:flex-row">
            <input
              type="url"
              inputMode="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube video URL..."
              aria-label="YouTube video URL"
              disabled={stage === "looking-up"}
              className="w-full flex-1 rounded-xl bg-transparent px-5 py-4 text-base text-ink placeholder:text-ink/30 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={stage === "looking-up" || !url.trim()}
              className="shrink-0 rounded-xl bg-ink px-7 py-4 text-base font-semibold text-paper transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {stage === "looking-up" ? "Looking up..." : "Convert"}
            </button>
          </div>
        </form>
      )}

      {stage === "error" && (
        <div className="animate-fade-in rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-soft">
          <p className="font-medium text-red-700">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={handleRetry}
              className="rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:border-black/20"
            >
              Try again
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {video && (stage === "ready" || stage === "converting" || stage === "done") && (
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-black/10 bg-white shadow-card">
          <div className="flex flex-col gap-5 p-6 sm:flex-row">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="h-40 w-full rounded-xl object-cover sm:h-28 sm:w-48"
            />
            <div className="flex flex-1 flex-col justify-center gap-1">
              <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-ink">
                {video.title}
              </h3>
              <p className="text-sm text-ink/50">{formatDuration(video.durationSeconds)}</p>
            </div>
          </div>

          <div className="border-t border-black/5 p-6">
            {stage === "ready" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-start gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                    Output format
                  </p>
                  <FormatToggle value={format} onChange={setFormat} />
                </div>

                {format === "mp3" ? (
                  <QualitySelector
                    label="Audio quality"
                    options={AUDIO_OPTIONS}
                    value={audioQuality}
                    onChange={setAudioQuality}
                  />
                ) : (
                  <QualitySelector
                    label="Video quality"
                    options={VIDEO_OPTIONS}
                    value={videoQuality}
                    onChange={setVideoQuality}
                  />
                )}

                <button
                  onClick={handleStartConversion}
                  className="w-full rounded-xl bg-ink py-4 text-base font-semibold text-paper transition-transform hover:scale-[1.005] active:scale-[0.995]"
                >
                  Start conversion
                </button>
              </div>
            )}

            {stage === "converting" && job && (
              <div className="flex flex-col gap-2 py-2">
                <ProgressBar progress={job.progress} label={stageLabel(job.status)} />
              </div>
            )}

            {stage === "done" && job && (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-sm text-ink/60">
                  Your {job.format.toUpperCase()} is ready
                  {job.fileSizeBytes ? ` · ${formatFileSize(job.fileSizeBytes)}` : ""}
                </p>
                <a
                  href={downloadUrl(job.id)}
                  className="w-full rounded-xl bg-ink py-4 text-base font-semibold text-paper transition-transform hover:scale-[1.005] active:scale-[0.995] sm:w-auto sm:px-10"
                >
                  Download {job.format.toUpperCase()}
                </a>
                <button
                  onClick={handleReset}
                  className="text-sm font-medium text-ink/50 underline-offset-4 hover:text-ink hover:underline"
                >
                  Convert another video
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function stageLabel(status: JobStatusResponse["status"]): string {
  switch (status) {
    case "queued":
      return "Queued...";
    case "fetching":
      return "Fetching video...";
    case "converting":
      return "Converting...";
    case "done":
      return "Done";
    case "error":
      return "Error";
    default:
      return "Working...";
  }
}
