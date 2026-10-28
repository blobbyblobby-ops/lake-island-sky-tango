import { createServerFn } from "@tanstack/react-start";
import type { Catalog, CatalogOffer, ChannelAdvice, ChannelId, Fit, Research } from "@/lib/lotcut/types";

type Input = {
  imageDataUrl: string;
  barcode: string;
  notes: string;
  condition: string;
};

const CHANNELS: ChannelId[] = ["ebay", "amazon", "mercari", "facebook", "whatnot"];
const FITS: Fit[] = ["best", "good", "avoid"];
const CATEGORIES = ["toy", "coin", "collectible", "other"] as const;

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function money(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[^0-9.]/g, ""))
        : NaN;
  if (!Number.isFinite(raw) || raw < 0 || raw > 50000) return null;
  return Math.round(raw * 100) / 100;
}

function asList(value: unknown, max: number, each: number): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];
  return source
    .map((entry) => clip(entry, each))
    .filter(Boolean)
    .slice(0, max);
}

function parseInput(data: unknown): Input {
  if (!data || typeof data !== "object") throw new Error("Missing item");
  const row = data as Record<string, unknown>;
  const imageDataUrl = typeof row.imageDataUrl === "string" ? row.imageDataUrl : "";
  const barcode = clip(row.barcode, 32);
  const notes = clip(row.notes, 500);
  const condition = clip(row.condition, 24) || "unknown";
  if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) {
    throw new Error("Photo was not a usable image");
  }
  if (imageDataUrl.length > 1_200_000) throw new Error("Photo is too large");
  if (!imageDataUrl && barcode.length < 8) throw new Error("Add a photo or a barcode first");
  return { imageDataUrl, barcode, notes, condition };
}

async function lookupUpc(barcode: string): Promise<Catalog | null> {
  const digits = barcode.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(digits)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      items?: Array<{
        title?: string;
        brand?: string;
        lowest_recorded_price?: number;
        highest_recorded_price?: number;
        offers?: Array<{ merchant?: string; price?: number; link?: string }>;
      }>;
    };
    const item = body.items?.[0];
    if (!item?.title) return null;
    const offers: CatalogOffer[] = (item.offers ?? [])
      .map((offer) => ({
        merchant: clip(offer.merchant, 60) || "Offer",
        price: money(offer.price) ?? 0,
        link: typeof offer.link === "string" ? offer.link.slice(0, 300) : undefined,
      }))
      .filter((offer) => offer.price > 0)
      .slice(0, 6);
    return {
      title: clip(item.title, 180),
      brand: clip(item.brand, 80),
      lowest: money(item.lowest_recorded_price),
      highest: money(item.highest_recorded_price),
      offers,
    };
  } catch {
    return null;
  }
}

function fromCatalog(catalog: Catalog, barcode: string): Research {
  const likely = catalog.lowest ?? catalog.offers[0]?.price ?? 0;
  const stretch = catalog.highest && catalog.highest > likely ? catalog.highest : likely;
  return {
    name: catalog.title,
    ebayTitle: catalog.title.slice(0, 80),
    brand: catalog.brand,
    category: "other",
    year: "",
    confidence: "medium",
    conditionNotes: "Matched a barcode catalog. Condition still has to come from your photo.",
    bullets: [
      catalog.brand ? `Brand: ${catalog.brand}` : "Brand not in the catalog record",
      `Barcode: ${barcode}`,
      catalog.title,
      "Confirm condition, completeness, and packaging before you publish.",
    ],
    specifics: [
      { label: "Barcode", value: barcode },
      ...(catalog.brand ? [{ label: "Brand", value: catalog.brand }] : []),
    ],
    channels: [
      { id: "ebay", fit: "best", why: "Start here unless the piece is new, sealed, and obviously a current Amazon product." },
      { id: "amazon", fit: "good", why: "Only if it is new and the catalog item is the same thing you are holding." },
      { id: "mercari", fit: "good", why: "Reasonable second shelf for a single barcoded item." },
      { id: "facebook", fit: "good", why: "Use it when shipping would erase the margin." },
      { id: "whatnot", fit: "avoid", why: "A catalog commodity rarely needs a live show." },
    ],
    priceLow: likely,
    priceLikely: likely,
    priceStretch: stretch,
    priceBasis: "Barcode catalog offers only. These are not live eBay or Amazon sold prices.",
    tips: [
      "Open the sold-comps search and price from completed sales, not from the catalog low.",
      "Put the barcode and the real condition in the first two bullets.",
    ],
    redFlags: ["The listing writer was unavailable, so this draft is catalog data only."],
    photoNeeds: ["Front", "Barcode", "Any damage"],
    compsQuery: catalog.title,
    catalog,
  };
}

function normalize(raw: unknown, catalog: Catalog | null, barcode: string): Research {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const category = CATEGORIES.includes(row.category as (typeof CATEGORIES)[number])
    ? (row.category as Research["category"])
    : "other";
  const confidence = row.confidence === "high" || row.confidence === "medium" || row.confidence === "low"
    ? row.confidence
    : "low";
  let low = money(row.priceLow) ?? 0;
  let likely = money(row.priceLikely) ?? low;
  let stretch = money(row.priceStretch) ?? likely;
  if (likely < low) likely = low;
  if (stretch < likely) stretch = likely;
  const name = clip(row.name, 140) || catalog?.title || "Unidentified item";
  let ebayTitle = clip(row.ebayTitle, 80) || name.slice(0, 80);
  if (ebayTitle.length > 80) ebayTitle = ebayTitle.slice(0, 80);

  const channels: ChannelAdvice[] = [];
  const seen = new Set<string>();
  if (Array.isArray(row.channels)) {
    for (const entry of row.channels) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, unknown>;
      const id = clip(rec.id, 20).toLowerCase() as ChannelId;
      if (!CHANNELS.includes(id) || seen.has(id)) continue;
      const fit = FITS.includes(rec.fit as Fit) ? (rec.fit as Fit) : "good";
      seen.add(id);
      channels.push({ id, fit, why: clip(rec.why, 220) || "No note." });
    }
  }
  for (const id of CHANNELS) {
    if (!seen.has(id)) channels.push({ id, fit: "good", why: "No specific note. Compare the fee table." });
  }
  if (!channels.some((channel) => channel.fit === "best")) channels[0] = { ...channels[0], fit: "best" };
  const bestCount = channels.filter((channel) => channel.fit === "best").length;
  if (bestCount > 1) {
    let marked = false;
    for (const channel of channels) {
      if (channel.fit === "best" && marked) channel.fit = "good";
      if (channel.fit === "best") marked = true;
    }
  }

  const specifics = Array.isArray(row.specifics)
    ? row.specifics
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const rec = entry as Record<string, unknown>;
          const label = clip(rec.label, 40);
          const value = clip(rec.value, 80);
          if (!label || !value) return null;
          return { label, value };
        })
        .filter((entry): entry is { label: string; value: string } => entry != null)
        .slice(0, 8)
    : [];
  if (barcode && !specifics.some((spec) => /barcode|upc|ean/i.test(spec.label))) {
    specifics.unshift({ label: "Barcode", value: barcode });
  }

  const basis = clip(row.priceBasis, 320) || "Model estimate only. Not a live sold listing.";
  const catalogNote =
    catalog?.lowest != null
      ? ` Barcode catalog shows recorded offers about $${catalog.lowest}${catalog.highest != null ? `–$${catalog.highest}` : ""}.`
      : "";

  return {
    name,
    ebayTitle,
    brand: clip(row.brand, 80) || catalog?.brand || "",
    category,
    year: clip(row.year, 20),
    confidence,
    conditionNotes: clip(row.conditionNotes, 400),
    bullets: asList(row.descriptionBullets, 8, 220),
    specifics,
    channels,
    priceLow: low,
    priceLikely: likely,
    priceStretch: stretch,
    priceBasis: `${basis}${catalogNote}`.trim(),
    tips: asList(row.tips, 5, 240),
    redFlags: asList(row.redFlags, 5, 220),
    photoNeeds: asList(row.photoNeeds, 4, 140),
    compsQuery: clip(row.compsQuery, 80) || name,
    catalog,
  };
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

export const researchListing = createServerFn({ method: "POST" })
  .validator(parseInput)
  .handler(async ({ data }): Promise<{ ok: true; research: Research } | { ok: false; error: string }> => {
    const catalog = data.barcode ? await lookupUpc(data.barcode) : null;
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      if (catalog) return { ok: true, research: fromCatalog(catalog, data.barcode) };
      return { ok: false, error: "The listing writer isn't available right now." };
    }

    const catalogHint = catalog
      ? `A barcode catalog returned "${catalog.title}"${catalog.brand ? ` by ${catalog.brand}` : ""}. Use it only if it matches the photo.`
      : "No barcode catalog match.";

    const prompt = `You write reseller listing drafts for one item a seller filmed in a pile of toys or coins.

Rules:
- Use only what is visible, plus the barcode, condition, and notes below.
- If you are unsure of the exact model, say so and set confidence to low. Never invent a year, mint mark, edition, brand, or completeness.
- Do not invent sold prices, dates, or sales ranks. priceLow, priceLikely, and priceStretch are rough US dollar ranges. priceBasis must say they are not live sold comps.
- ebayTitle is at most 80 characters. Brand, name, and variant first. No ALL CAPS, no emoji, no hype.
- descriptionBullets are short facts. No marketing fluff.
- Coins: never assign a numeric grade. Call it raw and ungraded. Mention a date or mint mark only if readable.
- Toys: say whether the box is sealed, open, or damaged, and only if you can see it.
- channels must include ebay, amazon, mercari, facebook, and whatnot. Exactly one fit is "best". Amazon is best only when the item looks new and sealed with a barcode. Open or damaged packaging should avoid Amazon. Coins should avoid Amazon.
- redFlags lists real risks only.
- tips: up to 3 concrete pricing or photo moves for this item.
- compsQuery is a short eBay search string.

${catalogHint}
Barcode: ${data.barcode || "none"}
Seller condition: ${data.condition}
Seller notes: ${data.notes || "none"}

Return JSON with keys: name, ebayTitle, brand, category, year, confidence, conditionNotes, descriptionBullets, specifics, channels, priceLow, priceLikely, priceStretch, priceBasis, tips, redFlags, photoNeeds, compsQuery.
category is toy, coin, collectible, or other. confidence is low, medium, or high. channels is [{id, fit, why}]. specifics is [{label, value}].`;

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: prompt },
    ];
    if (data.imageDataUrl) {
      content.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.2,
          max_tokens: 1400,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content }],
        }),
      });
      if (!res.ok) {
        if (catalog) return { ok: true, research: fromCatalog(catalog, data.barcode) };
        return { ok: false, error: `Listing writer failed (${res.status}). Try again.` };
      }
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      const parsed = parseModelJson(text);
      const research = normalize(parsed, catalog, data.barcode);
      if (!research.bullets.length) {
        research.bullets = [research.conditionNotes || research.name];
      }
      return { ok: true, research };
    } catch {
      if (catalog) return { ok: true, research: fromCatalog(catalog, data.barcode) };
      return { ok: false, error: "Listing writer didn't respond. Try that item again." };
    }
  });
