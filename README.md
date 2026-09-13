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

## Deploying to Render

The repo includes a [`render.yaml`](render.yaml) Blueprint that stands up two
services:

- **`convertly-api`** — a Docker web service (`server/Dockerfile`) with
  Node, `ffmpeg`, and `yt-dlp` preinstalled. Render's own container disk is
  used for temporary conversion files; nothing needs to be provisioned.
- **`convertly-client`** — a static site built from `client/`, with a
  catch-all rewrite to `index.html` so client-side routing (`/about`,
  `/terms`, `/privacy`) works on refresh/direct links.

### Steps

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard: **New +** → **Blueprint**, pick this repo/branch.
   Render reads `render.yaml` and proposes both services — click **Apply**.
3. Wait for both to finish deploying. Note the two URLs Render assigns
   (normally `https://convertly-api.onrender.com` and
   `https://convertly-client.onrender.com`, which is what `render.yaml`
   already wires together via `CLIENT_ORIGIN` and `VITE_API_BASE_URL`).
4. **If Render had to rename either service** (the name was taken), the two
   env vars above will point at the wrong URL. Fix it in each service's
   **Environment** tab:
   - On `convertly-api`: set `CLIENT_ORIGIN` to the actual client URL.
   - On `convertly-client`: set `VITE_API_BASE_URL` to the actual API URL,
     then trigger **Manual Deploy** (it's a build-time variable, so it only
     takes effect on a rebuild).
5. Open the client URL — the converter should work end-to-end.

Notes:
- The API's plan in `render.yaml` is `starter` (Render's free tier spins down
  on idle and cold-starts slowly, which hurts conversion UX — `starter` or
  higher is recommended for anything beyond a quick test).
- Render's `starter` web services have ephemeral disk, which is fine here:
  Convertly already deletes converted files ~15 minutes after completion,
  well within a single container's lifetime.
- To change rate limits, size/duration caps, etc., edit
  `server/src/middleware/rateLimit.ts` and `server/src/lib/ytdlp.ts`, then
  push — Render redeploys automatically on new commits by default.

### If conversions fail with "Video unavailable" / "Requested format is not available"

YouTube scores requests by IP reputation and by whether the client presents a
valid Proof-of-Origin (PO) token minted by its own BotGuard JavaScript.
Datacenter IPs (Render included) are scored low, so `yt-dlp` may fetch a
video's metadata fine but fail to get an actual downloadable format.
`server/src/lib/ytdlp.ts` already tries several player clients
(android/ios/tv_embedded/mweb/web) as a first line of defense, but that alone
isn't always enough. There are two ways to fix it beyond that — try them in
this order:

**1. Self-hosted PO token provider (recommended, no personal account needed)**

[`bgutil-ytdlp-pot-provider`](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)
runs YouTube's actual BotGuard JS to mint a real token — this is what's
being checked, so it works without any login. `render.yaml` already deploys
it as a private service (`convertly-potoken`) and wires `convertly-api` to
it via `POT_PROVIDER_URL`; the plugin is preinstalled in `server/Dockerfile`.
If you used the Blueprint flow, this is already active — nothing further to
do. Verified working end-to-end in development against a real public video.

**2. YouTube cookies (fallback, ties conversions to one account)**

If the PO token provider ever stops working (this is an ongoing arms race
with YouTube), an authenticated session is the other reliable option:

1. Log into YouTube in a normal browser with an account you have rights to
   convert from, and export its cookies with an extension like
   [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   (Netscape format). Use a dedicated account, not your primary one — it
   ties every conversion to that account's session, and could in theory get
   it flagged for automated activity.
2. On the `convertly-api` service in Render: **Environment** tab → **Secret
   Files** → add a file (e.g. path `/etc/secrets/youtube-cookies.txt`) with
   the cookies.txt contents.
3. Set the env var `YTDLP_COOKIES_FILE` to that same path.
4. Manual Deploy. `server/src/lib/ytdlp.ts` picks it up automatically and
   passes `--cookies` to every `yt-dlp` call.

Treat the cookies file like a credential. Re-export and replace it if
conversions start failing again (cookies expire).

## Pages

- `/` — Converter
- `/about` — About the service
- `/terms` — Terms of use
- `/privacy` — Privacy policy
