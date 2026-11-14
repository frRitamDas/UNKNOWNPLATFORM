# ─────────────────────────────────────────────────────────────────────────────
# Reelforge render worker
#
#   docker build -f worker/Dockerfile -t reelforge-worker .
#   docker run --env-file .env reelforge-worker
#
# Deploy anywhere that runs containers and has outbound access to Supabase:
# Fly.io, Railway, Render, a $6 VPS, or your own box.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim

# ffmpeg + the exact fonts the caption presets reference.
# Missing fonts is the #1 cause of "my export looks different" — install them.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      fonts-inter \
      fonts-dejavu-core \
      fonts-liberation \
      fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Keep the worker dependencies minimal and independent of the Next.js app.
RUN npm init -y >/dev/null 2>&1 \
 && npm install --no-audit --no-fund @supabase/supabase-js@2.119.0

COPY worker/index.mjs ./worker/index.mjs

ENV NODE_ENV=production \
    WORKER_CONCURRENCY=1 \
    WORKER_POLL_MS=4000

# Healthcheck: the process is the loop, so a live PID is a healthy worker.
HEALTHCHECK --interval=60s --timeout=10s --start-period=20s \
  CMD node -e "process.exit(0)"

CMD ["node", "worker/index.mjs"]
