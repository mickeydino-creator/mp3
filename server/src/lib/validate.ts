const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a canonical 11-char YouTube video ID from a URL, or null if the
 * URL isn't a recognizable single-video YouTube link. This is the only
 * gate before we ever shell out to the conversion pipeline, so it must
 * reject anything that isn't a plain https(s) YouTube watch URL.
 */
export function extractVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

  let id: string | null = null;

  if (url.hostname.toLowerCase() === "youtu.be") {
    id = url.pathname.replace(/^\//, "").split("/")[0] ?? null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/shorts/")) {
    id = url.pathname.split("/")[2] ?? null;
  } else if (url.pathname.startsWith("/embed/")) {
    id = url.pathname.split("/")[2] ?? null;
  }

  if (!id || !VIDEO_ID_RE.test(id)) return null;
  return id;
}

export function canonicalWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export type OutputFormat = "mp3" | "mp4";
export const AUDIO_QUALITIES = ["128", "192", "320"] as const;
export type AudioQuality = (typeof AUDIO_QUALITIES)[number];
export const VIDEO_QUALITIES = ["360", "720", "1080"] as const;
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];

export function isOutputFormat(v: unknown): v is OutputFormat {
  return v === "mp3" || v === "mp4";
}
export function isAudioQuality(v: unknown): v is AudioQuality {
  return AUDIO_QUALITIES.includes(v as AudioQuality);
}
export function isVideoQuality(v: unknown): v is VideoQuality {
  return VIDEO_QUALITIES.includes(v as VideoQuality);
}
