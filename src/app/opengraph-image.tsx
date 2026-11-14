import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Reelforge — paste the raw clip, get the finished video";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Bundled locally so the build never depends on a CDN fetch.
const interBold = await readFile(join(process.cwd(), "src/app/og/inter-800.woff"));

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06070A",
          padding: "64px 72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: 320,
            width: 760,
            height: 520,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(201,249,80,0.22) 0%, rgba(6,7,10,0) 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#C9F950",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4.8c0-.9 1-1.4 1.7-1L20 10.9c.7.4.7 1.4 0 1.8L8.7 19.8c-.7.4-1.7-.1-1.7-1V4.8Z" fill="#06070A" />
            </svg>
                    </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#F6F8FA", letterSpacing: -1 }}>Reelforge</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#F6F8FA", letterSpacing: -3, lineHeight: 1.05 }}>
            Paste the raw clip.
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#C9F950", letterSpacing: -3, lineHeight: 1.05 }}>
            Get the finished video.
          </div>
          <div style={{ marginTop: 18, fontSize: 30, color: "#8A93A3", maxWidth: 900, lineHeight: 1.35 }}>
            Word-level captions, auto reframe, one-click MP4 export.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["AI captions", "10 presets", "9:16 export", "Built on ffmpeg"].map((label) => (
            <div
              key={label}
              style={{
                border: "1px solid #2A313D",
                background: "#0E1116",
                color: "#B9C0CB",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: interBold, weight: 800, style: "normal" }],
    },
  );
}
