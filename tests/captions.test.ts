import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLines, findLineAt, activeWordIndex, sourceTimeAt, timelineTimeFor, formatTimecode } from "@/lib/captions/layout";
import { buildAss, buildSrt } from "@/lib/captions/ass";
import { PRESETS, getPreset, applyPreset } from "@/lib/captions/presets";
import { cssToAssColor, parseCssColor } from "@/lib/captions/colors";
import { transcriptFromScript, generateDemoTranscript, createEmptyDoc } from "@/lib/project-defaults";
import { timelineDuration, type Word, type ProjectDoc } from "@/lib/types";

const words: Word[] = [
  { w: "I", s: 0, e: 200 },
  { w: "stopped", s: 200, e: 700 },
  { w: "editing", s: 700, e: 1200 },
  { w: "frames", s: 1200, e: 1700 },
  { w: "by", s: 1700, e: 1900 },
  { w: "hand", s: 1900, e: 2400 },
];

test("buildLines respects the word budget", () => {
  const style = { ...getPreset("hormozi").style }; // 3 words / line
  const lines = buildLines(words, style);
  assert.ok(lines.length >= 2, "should split into multiple lines");
  for (const line of lines) assert.ok(line.words.length <= 3);
  // Every word survives exactly once, in order.
  assert.deepEqual(
    lines.flatMap((l) => l.words.map((w) => w.w)),
    words.map((w) => w.w),
  );
});

test("buildLines breaks on long pauses", () => {
  const gapped: Word[] = [
    { w: "one", s: 0, e: 300 },
    { w: "two", s: 2000, e: 2300 },
  ];
  const lines = buildLines(gapped, { ...getPreset("clean").style, maxWordsPerLine: 8, maxCharsPerLine: 40 });
  assert.equal(lines.length, 2);
});

test("word animation forces one word per line", () => {
  const lines = buildLines(words, { ...getPreset("karaoke-pop").style, maxWordsPerLine: 6 });
  for (const line of lines) assert.equal(line.words.length, 1);
});

test("line lookup and active word are consistent", () => {
  const style = getPreset("clean").style;
  const lines = buildLines(words, style);
  const mid = findLineAt(lines, lines[0].startMs + 50);
  assert.ok(mid, "a line should be active at its start");
  const idx = activeWordIndex(mid!, mid!.startMs + 10);
  assert.ok(idx >= 0 && idx < mid!.words.length);
  assert.equal(findLineAt(lines, 60_000), null, "no line after the end");
});

test("timings are monotonic and never negative", () => {
  const style = getPreset("clean").style;
  const lines = buildLines(words, style);
  for (const line of lines) {
    assert.ok(line.startMs >= 0);
    assert.ok(line.endMs >= line.startMs);
    for (let i = 1; i < line.words.length; i++) {
      assert.ok(line.words[i].s >= line.words[i - 1].s, "words must be ordered");
    }
  }
});

test("ASS output is well formed for every preset", () => {
  for (const preset of PRESETS) {
    const ass = buildAss(words, preset.style, { aspect: "9:16", width: 1080, height: 1920 });
    assert.match(ass, /\[Script Info\]/);
    assert.match(ass, /PlayResX: 1080/);
    assert.match(ass, /PlayResY: 1920/);
    assert.match(ass, /\[Events\]/);
    assert.ok(!ass.includes("NaN"), `${preset.id} produced NaN`);
    assert.ok(!ass.includes("undefined"), `${preset.id} produced undefined`);

    const dialogues = ass.split("\n").filter((line) => line.startsWith("Dialogue:"));
    assert.ok(dialogues.length > 0, `${preset.id} produced no events`);

    for (const dialogue of dialogues) {
      const parts = dialogue.split(",");
      assert.equal(parts.length >= 10, true, "dialogue needs 10 fields");
      // Start/end parse to valid ASS timestamps.
      assert.match(parts[1], /^\d+:\d{2}:\d{2}\.\d{2}$/);
      assert.match(parts[2], /^\d+:\d{2}:\d{2}\.\d{2}$/);
      assert.ok(toCentiseconds(parts[2]) > toCentiseconds(parts[1]), "end must follow start");
    }
  }
});

test("ASS honours the trim offset", () => {
  const shifted = buildAss(words, getPreset("clean").style, {
    aspect: "9:16",
    width: 1080,
    height: 1920,
    offsetMs: -1000,
  });
  const firstEvent = shifted.split("\n").find((line) => line.startsWith("Dialogue:"));
  assert.ok(firstEvent);
  // First word starts at 0ms, real start is clamped to 0 (never negative time).
  assert.match(firstEvent!, /Dialogue: 0,0:00:00\.00,/);
});

test("uppercase and escaping work", () => {
  const tricky: Word[] = [{ w: "hello{world}", s: 0, e: 500 }];
  const ass = buildAss(tricky, { ...getPreset("beast").style, uppercase: true }, {
    aspect: "9:16",
    width: 1080,
    height: 1920,
  });
  const event = ass.split("\n").find((line) => line.startsWith("Dialogue:"))!;
  assert.ok(event.includes("HELLO"), "uppercase applied");
  assert.ok(event.includes("\\{WORLD\\}"), "braces escaped after uppercasing");
});

test("SRT export contains numbered cues", () => {
  const srt = buildSrt(words, getPreset("clean").style);
  assert.match(srt, /^1\r?\n/);
  assert.ok(srt.includes("-->"));
  assert.ok(srt.includes("stopped"));
});

test("colour conversion matches ASS byte order", () => {
  assert.equal(cssToAssColor("#FFFFFF"), "&H00FFFFFF");
  assert.equal(cssToAssColor("#FF0000"), "&H000000FF"); // red → BGR
  assert.equal(cssToAssColor("#0000FF"), "&H00FF0000"); // blue → BGR
  const parsed = parseCssColor("rgba(10, 20, 30, 0.5)");
  assert.equal(parsed.r, 10);
  assert.equal(parsed.a, 0.5);
});

test("presets are complete and unique", () => {
  const ids = new Set(PRESETS.map((p) => p.id));
  assert.equal(ids.size, PRESETS.length, "preset ids must be unique");
  assert.ok(PRESETS.length >= 10);
  for (const preset of PRESETS) {
    assert.ok(preset.style.fontScale > 0);
    assert.ok(preset.style.maxWordsPerLine >= 1);
    assert.ok(preset.style.positionYPct > 0 && preset.style.positionYPct < 100);
  }
});

test("applyPreset keeps the user's vertical position", () => {
  const custom = { ...getPreset("clean").style, positionYPct: 42 };
  const next = applyPreset(custom, "hormozi");
  assert.equal(next.positionYPct, 42);
  assert.equal(next.presetId, "hormozi");
  assert.equal(next.fontScale, getPreset("hormozi").style.fontScale);
});

test("script timings scale to the clip duration", () => {
  const script = "one two three four five six seven eight";
  const generated = transcriptFromScript(script, 8000);
  assert.equal(generated.length, 8);
  assert.ok(generated[0].s === 0);
  assert.ok(generated[generated.length - 1].e <= 8000);
  assert.ok(generated[generated.length - 1].e > 7000, "should use most of the duration");
});

test("demo transcript never exceeds the clip duration", () => {
  for (const duration of [3000, 15000, 60000]) {
    const demo = generateDemoTranscript(duration);
    assert.ok(demo.length > 0);
    for (const word of demo) assert.ok(word.e <= duration, `word after ${duration}ms`);
  }
});

test("timeline helpers map source and programme time", () => {
  const doc = createEmptyDoc("test");
  doc.clips = [
    {
      id: "a",
      name: "a.mp4",
      src: "local:a",
      inMs: 1000,
      outMs: 5000,
      sourceDurationMs: 10000,
      volume: 1,
      muted: false,
    },
  ];
  assert.equal(timelineDuration(doc), 4000);
  assert.equal(sourceTimeAt(doc, 0), 1000);
  assert.equal(sourceTimeAt(doc, 2000), 3000);
  assert.equal(timelineTimeFor(doc, 1000), 0);
  assert.equal(timelineTimeFor(doc, 3000), 2000);
  assert.equal(timelineTimeFor(doc, 9000), -1, "source past the trim is not on the timeline");
});

test("two-clip documents chain correctly", () => {
  const doc = createEmptyDoc("multi") as ProjectDoc;
  doc.clips = [
    { id: "a", name: "a", src: "local:a", inMs: 0, outMs: 2000, sourceDurationMs: 2000, volume: 1, muted: false },
    { id: "b", name: "b", src: "local:b", inMs: 500, outMs: 2500, sourceDurationMs: 3000, volume: 1, muted: false },
  ];
  assert.equal(timelineDuration(doc), 4000);
  assert.equal(sourceTimeAt(doc, 1000), 1000);
  assert.equal(sourceTimeAt(doc, 2500), 1000, "second clip starts 500ms into its source");
});

test("timecode formatting", () => {
  assert.equal(formatTimecode(0), "0:00");
  assert.equal(formatTimecode(65_000), "1:05");
  assert.equal(formatTimecode(3_725_000), "1:02:05");
  assert.equal(formatTimecode(1500, true), "0:01.500");
});

function toCentiseconds(stamp: string): number {
  const [hms, cs] = stamp.split(".");
  const [h, m, s] = hms.split(":").map(Number);
  return ((h * 3600 + m * 60 + s) * 100) + Number(cs);
}
