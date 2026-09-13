FROM node:20-bookworm-slim

# ffmpeg for audio/video encoding, python3+pip to install yt-dlp, ca-certificates
# so yt-dlp can reach YouTube over TLS, git to fetch the PO token provider.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      ca-certificates \
      git \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp bgutil-ytdlp-pot-provider

# bgutil-ytdlp-pot-provider's HTTP server: mints a real YouTube Proof-of-
# Origin token (by running YouTube's own BotGuard JS) so yt-dlp can get
# real download formats from this container's IP without a personal
# account/cookies. Runs as a second process in this same container on
# localhost only — no separate paid service needed.
RUN git clone --depth 1 --branch 2.0.0 \
      https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/potprovider \
    && cd /opt/potprovider/server \
    && npm ci \
    && npx tsc \
    && npm prune --omit=dev

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript --no-save && npx tsc -p tsconfig.json && npm uninstall typescript

COPY start.sh ./
RUN chmod +x start.sh

ENV NODE_ENV=production
ENV STORAGE_DIR=/app/storage
ENV POT_PROVIDER_URL=http://127.0.0.1:4416
RUN mkdir -p /app/storage

EXPOSE 4000
CMD ["./start.sh"]
