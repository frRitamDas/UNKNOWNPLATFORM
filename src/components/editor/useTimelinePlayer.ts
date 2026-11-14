"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Clip, ProjectDoc } from "@/lib/types";
import { timelineDuration } from "@/lib/types";

type Args = {
  doc: ProjectDoc | null;
  srcMap: Record<string, string>;
};

type ClipWindow = { clip: Clip; startMs: number; endMs: number };

export function clipWindowAt(doc: ProjectDoc | null, ms: number): ClipWindow | null {
  if (!doc || !doc.clips.length) return null;
  let cursor = 0;
  for (const clip of doc.clips) {
    const length = Math.max(0, clip.outMs - clip.inMs);
    if (ms < cursor + length || clip === doc.clips[doc.clips.length - 1]) {
      return { clip, startMs: cursor, endMs: cursor + length };
    }
    cursor += length;
  }
  return null;
}

/**
 * Owns the single <video> element and maps the project timeline (trimmed,
 * multi-clip) onto source media time. Drives the caption preview at ~60fps.
 */
export function useTimelinePlayer({ doc, srcMap }: Args) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const docRef = useRef<ProjectDoc | null>(doc);
  const timeRef = useRef(0);
  const rafRef = useRef(0);

  const [time, setTimeState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  docRef.current = doc;
  const duration = useMemo(() => (doc ? timelineDuration(doc) : 0), [doc]);
  const window_ = clipWindowAt(doc, time);
  const activeClip = window_?.clip ?? null;
  const activeSrc = activeClip ? (srcMap[activeClip.src] ?? activeClip.src) : "";

  const setTime = useCallback((ms: number) => {
    const max = docRef.current ? timelineDuration(docRef.current) : 0;
    const next = Math.max(0, Math.min(max, ms));
    timeRef.current = next;
    setTimeState(next);
  }, []);

  const seek = useCallback(
    (ms: number) => {
      const currentDoc = docRef.current;
      const win = clipWindowAt(currentDoc, ms);
      const video = videoRef.current;
      setTime(ms);
      if (win && video) {
        const sourceMs = win.clip.inMs + (Math.max(0, Math.min(win.endMs, ms)) - win.startMs);
        try {
          video.currentTime = Math.max(0, sourceMs / 1000);
        } catch {
          /* seeking before metadata is ready is fine to ignore */
        }
      }
    },
    [setTime],
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    setPlaying(false);
    videoRef.current?.pause();
    stopLoop();
  }, [stopLoop]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const currentDoc = docRef.current;
    if (!video || !currentDoc) return;

    const win = clipWindowAt(currentDoc, timeRef.current);
    if (!win) return;

    const sourceMs = video.currentTime * 1000;
    const total = timelineDuration(currentDoc);

    // Reached the trim-out point: jump to the next clip or stop.
    if (sourceMs >= win.clip.outMs - 8) {
      const nextMs = win.endMs + 4;
      if (nextMs >= total - 4) {
        setTime(total);
        setPlaying(false);
        video.pause();
        stopLoop();
        return;
      }
      setTime(nextMs);
      const nextWin = clipWindowAt(currentDoc, nextMs);
      if (nextWin) {
        const nextSrc = srcMap[nextWin.clip.src] ?? nextWin.clip.src;
        if (video.src !== nextSrc) video.src = nextSrc;
        video.currentTime = (nextWin.clip.inMs + 4) / 1000;
        void video.play();
      }
    } else {
      setTime(win.startMs + (sourceMs - win.clip.inMs));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [setTime, srcMap, stopLoop]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !docRef.current) return;
    const total = timelineDuration(docRef.current);
    if (timeRef.current >= total - 10) seek(0);

    const win = clipWindowAt(docRef.current, timeRef.current);
    if (win && video.readyState >= 1) {
      const desired = (win.clip.inMs + (timeRef.current - win.startMs)) / 1000;
      if (Math.abs(video.currentTime - desired) > 0.25) video.currentTime = desired;
    }
    try {
      await video.play();
      setPlaying(true);
      stopLoop();
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setPlaying(false);
    }
  }, [seek, stopLoop, tick]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else void play();
  }, [pause, play, playing]);

  // Keep the element's source in sync when the active clip changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;
    const desired = (activeClip.inMs + (timeRef.current - (window_?.startMs ?? 0))) / 1000;
    if (video.readyState >= 1 && Math.abs(video.currentTime - desired) > 0.3) {
      video.currentTime = Math.max(0, desired);
    }
  }, [activeClip, window_?.startMs]);

  // Reset when a different project loads.
  useEffect(() => {
    setReady(false);
    setTime(0);
    setPlaying(false);
    stopLoop();
  }, [doc?.clips[0]?.src, setTime, stopLoop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 1;
    video.muted = false;
  }, []);

  useEffect(() => () => stopLoop(), [stopLoop]);

  return {
    videoRef,
    time,
    playing,
    ready,
    setReady,
    duration,
    activeClip,
    activeSrc,
    activeWindow: window_,
    play,
    pause,
    toggle,
    seek,
    setTime,
  };
}

/** Global ms of a clip's start, used to draw the timeline. */
export function clipOffsets(clips: Clip[]): { startMs: number; lengthMs: number }[] {
  let cursor = 0;
  return clips.map((clip) => {
    const lengthMs = Math.max(0, clip.outMs - clip.inMs);
    const entry = { startMs: cursor, lengthMs };
    cursor += lengthMs;
    return entry;
  });
}
