import { bestChannel, CHANNELS, netOf } from "@/lib/lotcut/fees";
import { itemBullets, itemPrice, itemTitle, needsHandCheck, type LotItem } from "@/lib/lotcut/types";

export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function clock(t: number): string {
  const s = Math.max(0, Math.round(t));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function listingText(item: LotItem): string {
  const lines = [
    itemTitle(item),
    "",
    ...itemBullets(item).map((line) => `• ${line}`),
  ];
  if (item.barcode) lines.push("", `Barcode: ${item.barcode}`);
  const cond = item.condition === "unknown" ? "" : item.condition.replace("_", " ");
  if (cond) lines.push(`Condition noted: ${cond}`);
  const specs = item.research?.specifics ?? [];
  if (specs.length) {
    lines.push("", "Specifics:");
    for (const spec of specs) lines.push(`${spec.label}: ${spec.value}`);
  }
  return lines.join("\n").trim();
}

export function lotBrief(items: LotItem[]): string {
  const lines = ["Lotcut brief", ""];
  let likely = 0;
  let net = 0;
  for (const item of items) {
    const price = itemPrice(item);
    const channel = CHANNELS[bestChannel(item)].label;
    if (price != null) {
      likely += price;
      net += netOf(price, bestChannel(item));
    }
    const flag = needsHandCheck(item) ? " · check by hand" : "";
    lines.push(
      `${itemTitle(item)} — ${price == null ? "unpriced" : money(price)} · ${channel}${flag}`,
    );
    if (item.barcode) lines.push(`  Barcode ${item.barcode}`);
  }
  lines.push(
    "",
    `Likely total ${money(likely)} · about ${money(net)} after the recommended channel fee, before shipping.`,
    "",
    "Prices are estimates and catalog offers, not a live scrape of sold listings. Open the sold search before you publish.",
    "",
    items.map((item) => listingText(item)).join("\n\n---\n\n"),
  );
  return lines.join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function lotCsv(items: LotItem[]): string {
  const headers = [
    "Title",
    "Barcode",
    "Category",
    "Condition",
    "Your price",
    "Low",
    "Stretch",
    "Best channel",
    "Net on that channel",
    "Description",
    "Tips",
    "Hand check",
  ];
  const rows = items.map((item) => {
    const price = itemPrice(item);
    const channel = bestChannel(item);
    return [
      itemTitle(item),
      item.barcode,
      item.research?.category ?? "",
      item.condition,
      price == null ? "" : String(price),
      item.research ? String(item.research.priceLow) : "",
      item.research ? String(item.research.priceStretch) : "",
      CHANNELS[channel].label,
      price == null ? "" : String(netOf(price, channel)),
      itemBullets(item).join(" | "),
      (item.research?.tips ?? []).join(" | "),
      needsHandCheck(item) ? "yes" : "",
    ].map(csvCell);
  });
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
