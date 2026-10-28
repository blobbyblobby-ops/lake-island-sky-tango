import { detectOnCanvas, pickBarcode } from "@/lib/lotcut/barcodes";
import { blankItem, uid, type Detected, type LotItem, type Shot } from "@/lib/lotcut/types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that photo"));
    img.src = src;
  });
}

export async function fileToShot(file: File): Promise<{ shot: Shot; barcode: Detected | null }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / Math.max(img.naturalWidth, 1));
    canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't read photos");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const barcode = pickBarcode(await detectOnCanvas(canvas));
    return { shot: { id: uid(), t: 0, src: canvas.toDataURL("image/jpeg", 0.72) }, barcode };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function photosToItems(files: File[]): Promise<LotItem[]> {
  const items: LotItem[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const { shot, barcode } = await fileToShot(file);
    items.push(blankItem([shot], barcode?.raw ?? "", barcode?.format ?? ""));
  }
  return items;
}

export async function prepareImage(src: string): Promise<string> {
  const img = await loadImage(src);
  const maxW = 720;
  const scale = Math.min(1, maxW / Math.max(img.naturalWidth, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the photo");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  let quality = 0.68;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > 900_000 && quality > 0.4) {
    quality -= 0.08;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}
