export type ChannelId = "ebay" | "amazon" | "mercari" | "facebook" | "whatnot";

export type Fit = "best" | "good" | "avoid";

export type Condition = "new" | "like_new" | "good" | "fair" | "poor" | "unknown";

export type Shot = {
  id: string;
  t: number;
  src: string;
};

export type ChannelAdvice = {
  id: ChannelId;
  fit: Fit;
  why: string;
};

export type CatalogOffer = {
  merchant: string;
  price: number;
  link?: string;
};

export type Catalog = {
  title: string;
  brand: string;
  lowest: number | null;
  highest: number | null;
  offers: CatalogOffer[];
};

export type Research = {
  name: string;
  ebayTitle: string;
  brand: string;
  category: "toy" | "coin" | "collectible" | "other";
  year: string;
  confidence: "low" | "medium" | "high";
  conditionNotes: string;
  bullets: string[];
  specifics: { label: string; value: string }[];
  channels: ChannelAdvice[];
  priceLow: number;
  priceLikely: number;
  priceStretch: number;
  priceBasis: string;
  tips: string[];
  redFlags: string[];
  photoNeeds: string[];
  compsQuery: string;
  catalog: Catalog | null;
};

export type LotItem = {
  id: string;
  shots: Shot[];
  barcode: string;
  barcodeFormat: string;
  condition: Condition;
  notes: string;
  status: "idle" | "researching" | "ready" | "error";
  error: string;
  research: Research | null;
  titleOverride: string;
  bulletOverride: string;
  priceOverride: number | null;
};

export type Detected = { raw: string; format: string };

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function blankItem(shots: Shot[], barcode = "", barcodeFormat = ""): LotItem {
  return {
    id: uid(),
    shots,
    barcode,
    barcodeFormat,
    condition: "unknown",
    notes: "",
    status: "idle",
    error: "",
    research: null,
    titleOverride: "",
    bulletOverride: "",
    priceOverride: null,
  };
}

export function itemTitle(item: LotItem): string {
  const custom = item.titleOverride.trim();
  if (custom) return custom;
  return item.research?.ebayTitle || item.research?.name || "Untitled item";
}

export function itemBullets(item: LotItem): string[] {
  const raw = item.bulletOverride.trim()
    ? item.bulletOverride
    : (item.research?.bullets ?? []).join("\n");
  return raw
    .split("\n")
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

export function itemPrice(item: LotItem): number | null {
  if (item.priceOverride != null && Number.isFinite(item.priceOverride)) return item.priceOverride;
  if (item.research) return item.research.priceLikely;
  return null;
}

export function needsHandCheck(item: LotItem): boolean {
  const research = item.research;
  if (!research) return false;
  if (research.redFlags.length > 0) return true;
  if (research.confidence === "low") return true;
  if (research.category === "coin") return true;
  if (research.priceLikely >= 80) return true;
  return false;
}
