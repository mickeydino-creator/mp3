FROM node:20-bookworm-slim

# ffmpeg for audio/video encoding, python3+pip to install yt-dlp, ca-certificates
# so yt-dlp can reach YouTube over TLS.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp bgutil-ytdlp-pot-provider

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript --no-save && npx tsc -p tsconfig.json && npm uninstall typescript

ENV NODE_ENV=production
ENV STORAGE_DIR=/app/storage
RUN mkdir -p /app/storage

EXPOSE 4000
CMD ["node", "dist/index.js"]
