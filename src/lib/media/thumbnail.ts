/** Grabs a JPEG data-URL poster frame from a video URL. Safe to fail. */
export function captureThumbnail(src: string, atSeconds = 1, maxWidth = 360): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !src) return resolve(null);
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };

    video.onloadeddata = () => {
      const target = Number.isFinite(video.duration) ? Math.min(atSeconds, Math.max(0.1, video.duration - 0.1)) : 0.5;
      video.currentTime = target;
    };

    video.onseeked = () => {
      try {
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(2, Math.round((video.videoWidth || 270) * scale));
        canvas.height = Math.max(2, Math.round((video.videoHeight || 480) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.62));
      } catch {
        finish(null);
      }
    };

    video.onerror = () => finish(null);
    video.src = src;
    setTimeout(() => finish(null), 15000);
  });
}
