import { detectOnCanvas, pickBarcode } from "@/lib/lotcut/barcodes";
import { blankItem, uid, type LotItem, type Shot } from "@/lib/lotcut/types";

const MAX_DURATION = 180;
const MAX_SAMPLES = 150;

export type CutProgress = { done: number; total: number; label: string };

type Sample = { t: number; grid: Uint8Array; sharp: number };

type Run = { t0: number; t1: number; bestT: number; bestSharp: number };

function gridOf(ctx: CanvasRenderingContext2D, cols = 16, rows = 9): Uint8Array {
  const { width, height } = ctx.canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const grid = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) / cols) * width));
      const sy = Math.min(height - 1, Math.floor(((y + 0.5) / rows) * height));
      const i = (sy * width + sx) * 4;
      grid[y * cols + x] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    }
  }
  return grid;
}

function meanLuma(grid: Uint8Array): number {
  let sum = 0;
  for (const value of grid) sum += value;
  return sum / grid.length;
}

function gridDiff(a: Uint8Array, b: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

function sharpnessOf(ctx: CanvasRenderingContext2D): number {
  const { width, height } = ctx.canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const gray = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  };
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y += 3) {
    for (let x = 1; x < width - 1; x += 3) {
      const g = gray(x, y) * 4 - gray(x - 1, y) - gray(x + 1, y) - gray(x, y - 1) - gray(x, y + 1);
      sum += g;
      sum2 += g * g;
      n += 1;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.min(Math.max(time, 0), Math.max((video.duration || 0) - 0.04, 0));
    if (Math.abs(video.currentTime - target) < 0.03 && video.readyState >= 2) {
      resolve();
      return;
    }
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Couldn't step through that video"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    video.currentTime = target;
  });
}

async function paint(video: HTMLVideoElement) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function draw(video: HTMLVideoElement, maxW: number): CanvasRenderingContext2D {
  const scale = Math.min(1, maxW / Math.max(video.videoWidth, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser can't read video frames");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return ctx;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function buildRuns(samples: Sample[], threshold: number): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const prev = samples[i - 1];
    const delta = prev ? gridDiff(prev.grid, sample.grid) : 0;
    if (!cur || delta > threshold) {
      if (cur) runs.push(cur);
      cur = { t0: sample.t, t1: sample.t, bestT: sample.t, bestSharp: sample.sharp };
    } else {
      cur.t1 = sample.t;
      if (sample.sharp >= cur.bestSharp) {
        cur.bestSharp = sample.sharp;
        cur.bestT = sample.t;
      }
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

function keepRuns(runs: Run[]): Run[] {
  if (runs.length <= 1) return runs;
  const mid = median(runs.map((run) => run.bestSharp));
  const kept = runs.filter((run) => run.bestSharp >= mid * 0.45);
  if (kept.length < Math.ceil(runs.length * 0.3)) return runs;
  return kept;
}

function groupRuns(runs: Run[], windowSec: number): Run[][] {
  if (windowSec <= 0) return runs.map((run) => [run]);
  const groups: Run[][] = [];
  for (const run of runs) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && run.t0 - prev.t1 <= windowSec && last.length < 4) last.push(run);
    else groups.push([run]);
  }
  return groups;
}

export async function cutVideo(
  video: HTMLVideoElement,
  opts: {
    sensitivity: number;
    groupWindow: number;
    signal: AbortSignal;
    onProgress: (progress: CutProgress) => void;
  },
): Promise<{ items: LotItem[]; note: string }> {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error("That file has no duration. Try an MP4, or add photos instead.");
  }
  if (!video.videoWidth) {
    throw new Error("Couldn't read the picture in that video.");
  }

  const clipped = video.duration > MAX_DURATION;
  const duration = Math.min(video.duration, MAX_DURATION);
  let step = 0.5;
  if (duration / step > MAX_SAMPLES) step = duration / MAX_SAMPLES;

  const times: number[] = [];
  for (let t = 0.08; t < duration - 0.04; t += step) times.push(t);
  if (!times.length) times.push(0);

  const samples: Sample[] = [];
  for (let i = 0; i < times.length; i++) {
    if (opts.signal.aborted) throw new DOMException("Cancelled", "AbortError");
    opts.onProgress({
      done: i,
      total: times.length,
      label: "Sampling the video",
    });
    await seekTo(video, times[i]);
    await paint(video);
    const ctx = draw(video, 240);
    const grid = gridOf(ctx);
    if (meanLuma(grid) < 10) continue;
    samples.push({ t: times[i], grid, sharp: sharpnessOf(ctx) });
  }

  if (!samples.length) {
    throw new Error("Those frames were too dark to cut. Add a lamp and film again.");
  }

  const threshold = 30 - (Math.min(100, Math.max(1, opts.sensitivity)) / 100) * 24;
  const runs = keepRuns(buildRuns(samples, threshold));
  const groups = groupRuns(runs, opts.groupWindow).slice(0, 60);

  const items: LotItem[] = [];
  for (let g = 0; g < groups.length; g++) {
    if (opts.signal.aborted) throw new DOMException("Cancelled", "AbortError");
    opts.onProgress({
      done: g,
      total: groups.length,
      label: "Reading frames and barcodes",
    });
    const shots: Shot[] = [];
    let barcode = "";
    let barcodeFormat = "";
    for (const run of groups[g]) {
      await seekTo(video, run.bestT);
      await paint(video);
      const ctx = draw(video, 960);
      const hit = pickBarcode(await detectOnCanvas(ctx.canvas));
      if (hit && !barcode) {
        barcode = hit.raw;
        barcodeFormat = hit.format;
      }
      shots.push({
        id: uid(),
        t: run.bestT,
        src: ctx.canvas.toDataURL("image/jpeg", 0.72),
      });
    }
    items.push(blankItem(shots, barcode, barcodeFormat));
  }

  if (!items.length) {
    throw new Error("No items found. Pause for a second on each piece, or add photos.");
  }

  const noun = items.length === 1 ? "item" : "items";
  const grouped = opts.groupWindow > 0;
  const note = [
    clipped ? "Only the first 3 minutes were cut." : "",
    grouped
      ? `Cut into ${items.length} ${noun}. Pauses within ${opts.groupWindow}s were kept together — split any that are different pieces.`
      : `Cut into ${items.length} ${noun}, one per pause. If the barcode was a second pause, tap Same as next.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { items, note };
}
