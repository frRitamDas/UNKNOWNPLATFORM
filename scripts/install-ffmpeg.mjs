#!/usr/bin/env node
/**
 * Installs a static ffmpeg/ffprobe build for local development so
 * `npm run worker` works without a system ffmpeg.
 *
 * Downloads from the ffmpeg-static / ffprobe-static npm packages (GitHub releases).
 */
import { execFileSync } from "node:child_process";

function tryInstall(pkg) {
  try {
    execFileSync("npm", ["install", "--no-audit", "--no-fund", "--no-save", pkg], { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

const ffmpeg = tryInstall("ffmpeg-static");
const ffprobe = tryInstall("ffprobe-static");

console.log(ffmpeg ? "✓ ffmpeg-static installed" : "✗ ffmpeg-static failed — install ffmpeg with your package manager");
console.log(ffprobe ? "✓ ffprobe-static installed" : "✗ ffprobe-static failed — duration probing will be limited");

try {
  const version = execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0];
  console.log(`  system ffmpeg: ${version}`);
} catch {
  /* fine */
}

if (!ffmpeg && !process.env.FFMPEG_PATH) {
  console.log("\nSet FFMPEG_PATH=/path/to/ffmpeg if you installed it somewhere custom.");
  process.exitCode = 1;
}
