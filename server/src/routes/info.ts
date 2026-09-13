import { Router } from "express";
import { extractVideoId } from "../lib/validate.js";
import { fetchVideoInfo, YtDlpError } from "../lib/ytdlp.js";
import { infoLimiter } from "../middleware/rateLimit.js";

export const infoRouter = Router();

infoRouter.post("/info", infoLimiter, async (req, res) => {
  const rawUrl = req.body?.url;
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a YouTube URL." });
  }

  const videoId = extractVideoId(rawUrl);
  if (!videoId) {
    return res.status(400).json({
      error: "That doesn't look like a valid YouTube video URL.",
    });
  }

  try {
    const meta = await fetchVideoInfo(videoId);
    return res.json({ video: meta });
  } catch (err) {
    if (err instanceof YtDlpError) {
      const statusByCode: Record<string, number> = {
        UNAVAILABLE: 404,
        RESTRICTED: 403,
        UNSUPPORTED: 422,
        TOO_LONG: 422,
        TIMEOUT: 504,
      };
      return res
        .status(statusByCode[err.code] ?? 500)
        .json({ error: err.message, code: err.code });
    }
    console.error("info lookup failed", err);
    return res.status(500).json({ error: "Something went wrong while looking up this video." });
  }
});
