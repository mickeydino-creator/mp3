# Convertly

Convertly is a fast, minimal web app for converting YouTube videos you own or
have permission to download into MP3 or MP4 files.

- Paste a link, and Convertly fetches the video's title, thumbnail, and duration.
- Choose MP3 (128/192/320 kbps) or MP4 (360p/720p/1080p).
- Real conversion runs server-side and reports live progress.
- Download the finished file; temporary files are auto-deleted shortly after.

**Convertly is only intended for videos you own or have explicit permission to
download.** It does not bypass DRM, access restricted or private content, or
circumvent platform protections — see [`/terms`](client/src/pages/Terms.tsx).

## Architecture

```
client/   React + Vite + TypeScript + Tailwind frontend
server/   Express + TypeScript API, conversion pipeline, rate limiting
```

The server never talks to any paid third-party API — conversions are
performed locally on the server using [`yt-dlp`](https://github.com/yt-dlp/yt-dlp)
(metadata + download) and `ffmpeg` (audio/video encoding), both of which must
be installed on the host. No API keys are required or exposed to the frontend.

### Request flow

1. `POST /api/info` — validates the URL is a real YouTube video link, then
   calls `yt-dlp -J --skip-download` to fetch title/thumbnail/duration and
   reject private, live, or excessively long videos.
2. `POST /api/convert` — creates an in-memory job, immediately returns a
   `jobId`, and starts a background `yt-dlp` process (audio extraction for
   MP3, format-limited download + mux for MP4). Progress is parsed from
   `yt-dlp`'s stdout and stored on the job.
3. `GET /api/convert/:jobId` — the frontend polls this for status/progress.
4. `GET /api/convert/:jobId/download` — streams the finished file once ready.
5. A background sweeper deletes job files and records ~15 minutes after
   completion (and hard-expires any job after 60 minutes) so nothing lingers
   on disk.

### Safety & limits

- Strict URL validation only accepts `youtube.com` / `youtu.be` watch, shorts,
  and embed links — anything else is rejected before it reaches the shell.
- All `yt-dlp`/`ffmpeg` invocations use `spawn` with an argument array (no
  shell interpolation), so there is no command-injection surface.
- Videos over 3 hours, live streams, and private/restricted videos are
  rejected up front.
- Converted files are capped at 500 MB; oversized results are deleted
  immediately rather than served.
- Downloads are constrained to the configured storage directory (no path
  traversal).
- Per-IP rate limiting on lookup, conversion, and status/download endpoints.
- `helmet` + a locked-down CORS origin on the API.

## Setup

### Prerequisites

- Node.js 18+
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp#installation) on `PATH` (or set `YTDLP_PATH`)
- [`ffmpeg`](https://ffmpeg.org/download.html) on `PATH` (or set `FFMPEG_PATH`)

### Install

```bash
npm install --workspaces
```

### Configure

```bash
cp server/.env.example server/.env
# edit server/.env if needed (ports, binary paths, storage dir)
```

### Run in development

```bash
npm run dev
```

This starts the API on `:4000` and the Vite dev server on `:5173` (which
proxies `/api` to the backend).

### Build for production

```bash
npm run build
npm start   # serves the built API; the API alone is server/dist/index.js
```

Deploy `client/dist` as a static site (any static host / CDN / reverse proxy)
and point it at the API's `/api` path, or serve both from the same origin
behind a reverse proxy (nginx, Caddy) that forwards `/api/*` to the Node
process on `PORT`. Ensure `yt-dlp` and `ffmpeg` are installed on whatever
host runs `server/`.

## Pages

- `/` — Converter
- `/about` — About the service
- `/terms` — Terms of use
- `/privacy` — Privacy policy
