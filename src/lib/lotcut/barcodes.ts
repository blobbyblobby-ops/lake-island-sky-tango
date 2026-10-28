import { BrowserMultiFormatReader } from "@zxing/browser";
import type { Detected } from "@/lib/lotcut/types";

type Hit = { rawValue?: string; format?: string };

type Detector = {
  detect: (source: CanvasImageSource) => Promise<Hit[]>;
};

const FORMATS = ["upc_a", "upc_e", "ean_13", "ean_8", "code_128", "code_39", "itf", "qr_code"];

let detector: Detector | null | undefined;
let reader: BrowserMultiFormatReader | null = null;

function getDetector(): Detector | null {
  if (detector !== undefined) return detector;
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
    }
  ).BarcodeDetector;
  if (!Ctor) {
    detector = null;
    return null;
  }
  try {
    detector = new Ctor({ formats: FORMATS });
  } catch {
    try {
      detector = new Ctor({ formats: [] });
    } catch {
      detector = null;
    }
  }
  return detector;
}

function getReader(): BrowserMultiFormatReader {
  if (!reader) reader = new BrowserMultiFormatReader();
  return reader;
}

export function barcodeScannerAvailable(): boolean {
  return true;
}

function rank(format: string): number {
  if (/upc|ean|itf/i.test(format)) return 0;
  if (/128|39/i.test(format)) return 1;
  return 2;
}

export function pickBarcode(hits: Detected[]): Detected | null {
  if (!hits.length) return null;
  return [...hits].sort((a, b) => rank(a.format) - rank(b.format))[0] ?? null;
}

async function nativeDetect(canvas: HTMLCanvasElement): Promise<Detected[]> {
  const api = getDetector();
  if (!api) return [];
  try {
    const hits = await api.detect(canvas);
    return hits
      .map((hit) => ({
        raw: (hit.rawValue ?? "").trim(),
        format: hit.format || "unknown",
      }))
      .filter((hit) => hit.raw.length > 0);
  } catch {
    return [];
  }
}

export async function detectOnCanvas(canvas: HTMLCanvasElement): Promise<Detected[]> {
  const native = await nativeDetect(canvas);
  if (native.length) return native;
  try {
    const result = getReader().decodeFromCanvas(canvas);
    const raw = result.getText().trim();
    if (!raw) return [];
    return [{ raw, format: String(result.getBarcodeFormat()) }];
  } catch {
    return [];
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that photo"));
    img.src = src;
  });
}

export async function detectBarcodeFromSrc(src: string): Promise<Detected | null> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  const maxW = 960;
  const scale = Math.min(1, maxW / Math.max(img.naturalWidth, 1));
  canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return pickBarcode(await detectOnCanvas(canvas));
}