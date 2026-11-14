import type { ProjectDoc } from "@/lib/types";
import { timelineDuration } from "@/lib/types";
import { drawCaptionFrame, drawWatermark, drawProgressBar } from "@/lib/media/caption-canvas";

export type BrowserRenderOptions = {
  doc: ProjectDoc;
  srcMap: Record<string, string>;
  width: number;
  height: number;
  fps?: number;
  watermark?: string;
  onProgress?: (fraction: number, label: string) => void;
  signal?: AbortSignal;
};

export type BrowserRenderResult = { blob: Blob; mimeType: string; extension: string };

const MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4",
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  for (const mime of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      /* keep trying */
    }
  }
  return "video/webm";
}

/**
 * Exports the project entirely in the browser: canvas compositing + MediaRecorder.
 *
 * This is the "works with zero infrastructure" export path. It runs in real
 * time (a 60s clip takes ~60s) and produces MP4 where the browser supports it,
 * WEBM otherwise. For faster-than-realtime, watermark-free, font-perfect MP4s
 * use the ffmpeg worker instead.
 */
export async function renderInBrowser(options: BrowserRenderOptions): Promise<BrowserRenderResult> {
  const { doc, srcMap, width, height, fps = 30, watermark, onProgress, signal } = options;

  if (typeof document === "undefined") throw new Error("Browser export must run in the browser.");
  if (!doc.clips.length) throw new Error("Add a clip before exporting.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create the export canvas.");

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";
  video.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
  document.body.appendChild(video);

  let audioContext: AudioContext | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;

  try {
    // Audio graph: video element → destination (never to speakers, so it stays silent).
    if (!doc.clips.every((c) => c.muted)) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        try {
          audioContext = new Ctor();
          const source = audioContext.createMediaElementSource(video);
          destination = audioContext.createMediaStreamDestination();
          source.connect(destination);
        } catch {
          audioContext = null;
          destination = null;
        }
      }
    }

    const mimeType = pickMimeType();
    const stream = canvas.captureStream(fps);
    if (destination) for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: width >= 1920 ? 12_000_000 : width >= 1080 ? 8_000_000 : 4_500_000,
      audioBitsPerSecond: 128_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const total = timelineDuration(doc);
    let elapsed = 0;

    const drawFrame = (timelineMs: number) => {
      ctx.fillStyle = doc.framing.padColor || "#000000";
      ctx.fillRect(0, 0, width, height);

      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      const scale =
        doc.framing.fit === "cover"
          ? Math.max(width / vw, height / vh)
          : Math.min(width / vw, height / vh);

      // Blurred backdrop needs a cover-scaled copy of the frame first.
      if (doc.framing.background === "blur") {
        const coverScale = Math.max(width / vw, height / vh);
        const bw = vw * coverScale;
        const bh = vh * coverScale;
        ctx.save();
        ctx.filter = "blur(28px) brightness(0.55)";
        ctx.drawImage(video, (width - bw) / 2, (height - bh) / 2, bw, bh);
        ctx.restore();
      } else if (doc.framing.background === "gradient") {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#141922");
        gradient.addColorStop(1, "#080a0d");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh);

      if (doc.captions.enabled && doc.captions.words.length) {
        drawCaptionFrame(ctx, doc.captions.words, doc.captions.style, timelineMs, width, height);
      }
      if (doc.branding.watermarkEnabled && watermark) drawWatermark(ctx, watermark, width, height);
      if (doc.branding.progressBar && total > 0) drawProgressBar(ctx, timelineMs / total, width, height);
    };

    recorder.start(250);

    let globalStart = 0;
    for (const [clipIndex, clip] of doc.clips.entries()) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");

      video.src = srcMap[clip.src] ?? clip.src;
      video.muted = clip.muted;
      video.volume = Math.max(0, Math.min(1, clip.volume));

      await waitForEvent(video, "loadedmetadata", 20000);
      await seekTo(video, clip.inMs / 1000);
      drawFrame(globalStart);

      const clipLength = Math.max(0, clip.outMs - clip.inMs);
      onProgress?.(globalStart / total, `Rendering clip ${clipIndex + 1} of ${doc.clips.length}`);

      await video.play();

      await new Promise<void>((resolve, reject) => {
        let raf = 0;
        const step = () => {
          if (signal?.aborted) {
            cancelAnimationFrame(raf);
            reject(new DOMException("Export cancelled", "AbortError"));
            return;
          }
          const sourceMs = video.currentTime * 1000;
          const done = sourceMs >= clip.outMs - 10 || video.ended;
          const timelineMs = globalStart + Math.min(clipLength, Math.max(0, sourceMs - clip.inMs));

          drawFrame(timelineMs);
          elapsed = timelineMs;
          onProgress?.(Math.min(0.985, timelineMs / total), `Rendering ${Math.round((timelineMs / total) * 100)}%`);

          if (done) {
            resolve();
            return;
          }
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });

      video.pause();
      globalStart += clipLength;
    }

    // Hold the last frame briefly so the recorder flushes it.
    drawFrame(total);
    await new Promise((resolve) => setTimeout(resolve, 320));

    recorder.stop();
    await stopped;
    onProgress?.(1, "Finalising file…");
    void elapsed;

    const blob = new Blob(chunks, { type: mimeType });
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    return { blob, mimeType, extension };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    await audioContext?.close().catch(() => undefined);
  }
}

function waitForEvent(target: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
      if (ok) resolve();
      else reject(new Error("The video could not be decoded in this browser. Try exporting on the server instead."));
    };
    const onOk = () => finish(true);
    const onErr = () => finish(false);
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
    setTimeout(() => finish(false), timeoutMs);
  });
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - seconds) < 0.01) return resolve();
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = Math.max(0, seconds);
    setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }, 3000);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
