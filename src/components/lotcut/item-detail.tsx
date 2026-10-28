import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { detectBarcodeFromSrc, barcodeScannerAvailable } from "@/lib/lotcut/barcodes";
import { CHANNEL_ORDER, CHANNELS, netOf } from "@/lib/lotcut/fees";
import { clock, listingText, money } from "@/lib/lotcut/format";
import { amazonUrl, compsQuery, ebayActiveUrl, ebaySoldUrl, googleSoldUrl } from "@/lib/lotcut/links";
import { useLot } from "@/lib/lotcut/store";
import {
  itemBullets,
  itemPrice,
  itemTitle,
  needsHandCheck,
  type ChannelId,
  type Condition,
  type Fit,
  type LotItem,
} from "@/lib/lotcut/types";
import { writeListing } from "@/lib/lotcut/write";
import { Button, FieldLabel, fieldClass } from "@/components/lotcut/ui";

const CONDITIONS: { id: Condition; label: string }[] = [
  { id: "new", label: "New / sealed" },
  { id: "like_new", label: "Like new" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
  { id: "poor", label: "Poor" },
  { id: "unknown", label: "Not sure" },
];

const FIT_LABEL: Record<Fit, string> = {
  best: "Best shelf",
  good: "Works",
  avoid: "Skip",
};

function adviceFor(item: LotItem, id: ChannelId) {
  return item.research?.channels.find((channel) => channel.id === id);
}

export function ItemDetail({ item, onClose }: { item: LotItem; onClose: () => void }) {
  const update = useLot((state) => state.update);
  const remove = useLot((state) => state.remove);
  const mergeNext = useLot((state) => state.mergeNext);
  const splitShot = useLot((state) => state.splitShot);
  const setNotice = useLot((state) => state.setNotice);
  const hasNext = useLot((state) => {
    const index = state.items.findIndex((entry) => entry.id === item.id);
    return index >= 0 && index < state.items.length - 1;
  });
  const [scanning, setScanning] = useState(false);
  const [priceText, setPriceText] = useState("");
  const price = itemPrice(item);
  const title = itemTitle(item);
  const titleCount = item.titleOverride.length;
  const query = compsQuery(title, item.barcode, item.research?.compsQuery ?? "");
  const hand = needsHandCheck(item);
  const typedPrice = priceText.trim() === "" ? null : Number(priceText);
  const shownPrice = typedPrice != null && Number.isFinite(typedPrice) ? typedPrice : price;

  useEffect(() => {
    const next = item.priceOverride ?? item.research?.priceLikely ?? null;
    setPriceText(next == null ? "" : String(next));
  }, [item.id, item.status, item.priceOverride, item.research?.priceLikely]);

  async function copyListing() {
    try {
      await navigator.clipboard.writeText(listingText(item));
      setNotice("Copied the listing");
    } catch {
      setNotice("Couldn't copy from this browser");
    }
  }

  async function readCode() {
    if (!barcodeScannerAvailable()) {
      setNotice("This browser can't scan barcodes. Type the numbers instead.");
      return;
    }
    setScanning(true);
    try {
      for (const shot of item.shots) {
        const hit = await detectBarcodeFromSrc(shot.src);
        if (hit) {
          update(item.id, { barcode: hit.raw, barcodeFormat: hit.format });
          setNotice(`Found ${hit.raw}`);
          return;
        }
      }
      setNotice("No barcode in these frames. Add a closer photo or type it.");
    } catch {
      setNotice("Couldn't scan that photo");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 py-4 lg:py-0">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Button variant="quiet" onClick={onClose} className="px-0">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Lot
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            remove(item.id);
            onClose();
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Drop
        </Button>
      </div>

      <div>
        <p className="text-sm text-muted">
          {item.research?.category ?? "Unresearched"}
          {item.research ? ` · ${item.research.confidence} confidence` : ""}
        </p>
        <h2 className="mt-1 text-2xl">{item.research?.name || "New cut"}</h2>
      </div>

      <div className="film-edge flex gap-2 overflow-x-auto rounded-md p-3">
        {item.shots.map((shot) => (
          <figure key={shot.id} className="w-36 shrink-0">
            <img src={shot.src} alt="" className="aspect-square w-full rounded-sm object-cover" />
            <figcaption className="mt-1 flex items-center justify-between text-xs text-muted">
              <span className="tabular-nums">{shot.t > 0 ? clock(shot.t) : "Photo"}</span>
              {item.shots.length > 1 ? (
                <button
                  type="button"
                  className="min-h-11 px-1 text-fg"
                  onClick={() => splitShot(item.id, shot.id)}
                >
                  Split
                </button>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>

      {hand ? (
        <p className="rounded-md border border-primary bg-surface px-3 py-2 text-sm">
          Pull this one out of the batch and check it by hand before you price it.
        </p>
      ) : null}

      {item.research?.redFlags.length ? (
        <ul className="flex flex-col gap-1 text-sm">
          {item.research.redFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3">
        <label className="grid gap-1">
          <FieldLabel>Barcode</FieldLabel>
          <input
            className={`${fieldClass} font-mono`}
            value={item.barcode}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => update(item.id, { barcode: event.target.value.trim() })}
            placeholder="Type the UPC if the frame missed it"
          />
        </label>
        <label className="grid gap-1">
          <FieldLabel>Condition</FieldLabel>
          <select
            className={fieldClass}
            value={item.condition}
            onChange={(event) => update(item.id, { condition: event.target.value as Condition })}
          >
            {CONDITIONS.map((condition) => (
              <option key={condition.id} value={condition.id}>
                {condition.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <FieldLabel>Notes for the rewrite</FieldLabel>
          <textarea
            className={fieldClass}
            rows={3}
            value={item.notes}
            onChange={(event) => update(item.id, { notes: event.target.value })}
            placeholder="Mint mark looks like D. Box corner is crushed. Missing the poster."
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={item.status === "researching"}
          onClick={() => void writeListing(item.id)}
        >
          {item.status === "researching"
            ? "Writing…"
            : item.research
              ? "Rewrite listing"
              : "Write listing"}
        </Button>
        <Button onClick={() => void readCode()} disabled={scanning}>
          {scanning ? "Scanning…" : "Read barcode"}
        </Button>
        {hasNext ? <Button onClick={() => mergeNext(item.id)}>Same as next</Button> : null}
        <Button className="hidden lg:inline-flex" onClick={() => remove(item.id)}>
          Drop item
        </Button>
      </div>
      {item.error ? <p className="text-sm">{item.error}</p> : null}

      <section className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-xl">Price</h3>
          <p className="text-sm text-muted tabular-nums">
            {item.research
              ? `${money(item.research.priceLow)} – ${money(item.research.priceStretch)}`
              : "No band yet"}
          </p>
        </div>
        <label className="grid gap-1">
          <FieldLabel>Your price</FieldLabel>
          <input
            className={`${fieldClass} tabular-nums`}
            inputMode="decimal"
            value={priceText}
            onChange={(event) => setPriceText(event.target.value)}
            onBlur={() => {
              if (priceText.trim() === "") {
                update(item.id, { priceOverride: null });
                return;
              }
              const next = Number(priceText);
              if (Number.isFinite(next)) update(item.id, { priceOverride: next });
            }}
          />
        </label>
        <p className="text-sm text-muted">
          {item.research?.priceBasis ||
            "Write the listing for a range. Nothing here is a live eBay or Amazon sold price."}
        </p>
        {item.research?.catalog ? (
          <p className="text-sm">
            Catalog: {item.research.catalog.title}
            {item.research.catalog.lowest != null
              ? ` · recorded low ${money(item.research.catalog.lowest)}`
              : ""}
          </p>
        ) : null}
        <div>
          {CHANNEL_ORDER.map((id) => {
            const advice = adviceFor(item, id);
            const net = shownPrice == null ? null : netOf(shownPrice, id);
            return (
              <div key={id} className="border-t border-line py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">
                    {CHANNELS[id].label}
                    <span className="ml-2 text-muted">{CHANNELS[id].blurb}</span>
                  </p>
                  <p className="tabular-nums">{money(net)}</p>
                </div>
                {advice ? (
                  <p className="mt-1 text-sm text-muted">
                    <span className={advice.fit === "best" ? "text-primary" : ""}>
                      {FIT_LABEL[advice.fit]}.
                    </span>{" "}
                    {advice.why}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">Net after the typical fee, before shipping.</p>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted">
            Fees are typical US rates, not your seller invoice. Shipping, tax, and promoted listings are extra.
          </p>
        </div>
      </section>

      {item.research?.category === "coin" ? (
        <section className="rounded-md bg-raised px-3 py-3 text-sm">
          <h3 className="text-lg">Coin rules</h3>
          <p className="mt-2 text-muted">
            Do not assign a grade. Say raw and ungraded, then the year, mint mark, and the wear you can see.
            A blurry date is not a listing yet. Check a coin reference and eBay sold before you accept a
            common-date price.
          </p>
        </section>
      ) : (
        <section className="rounded-md bg-raised px-3 py-3 text-sm">
          <h3 className="text-lg">Toy rules</h3>
          <p className="mt-2 text-muted">
            Box, seal, and completeness move the price more than the title. New and sealed can belong on
            Amazon. Opened, damaged, or incomplete belongs on eBay, and the flaw goes in the first bullet.
          </p>
        </section>
      )}

      <section className="grid gap-3">
        <h3 className="text-xl">Listing</h3>
        <label className="grid gap-1">
          <span className="flex items-center justify-between text-sm text-muted">
            eBay title
            <span className="tabular-nums">{titleCount}/80</span>
          </span>
          <input
            className={fieldClass}
            value={item.titleOverride}
            maxLength={120}
            onChange={(event) => update(item.id, { titleOverride: event.target.value })}
            placeholder="Brand, name, the variant that changes the price"
          />
          {titleCount > 80 ? (
            <span className="text-sm">Trim it. eBay titles cut off after 80 characters.</span>
          ) : null}
        </label>
        <label className="grid gap-1">
          <FieldLabel>Bullets — facts only</FieldLabel>
          <textarea
            className={fieldClass}
            rows={6}
            value={item.bulletOverride}
            onChange={(event) => update(item.id, { bulletOverride: event.target.value })}
            placeholder={"Brand and model\nYear, if you can see it\nBarcode\nWhat is included and what is not"}
          />
        </label>
        {item.research?.specifics.length ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {item.research.specifics.map((spec) => (
              <div key={spec.label}>
                <dt className="text-muted">{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {item.research?.photoNeeds.length ? (
          <p className="text-sm text-muted">Still shoot: {item.research.photoNeeds.join(" · ")}</p>
        ) : null}
        {item.research?.tips.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {item.research.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void copyListing()} disabled={!title && !itemBullets(item).length}>
            Copy listing
          </Button>
          <a className={linkClass} href={ebaySoldUrl(query)} target="_blank" rel="noreferrer">
            eBay sold
          </a>
          <a className={linkClass} href={ebayActiveUrl(query)} target="_blank" rel="noreferrer">
            eBay asking
          </a>
          <a className={linkClass} href={amazonUrl(item.barcode || query)} target="_blank" rel="noreferrer">
            Amazon
          </a>
          <a className={linkClass} href={googleSoldUrl(query)} target="_blank" rel="noreferrer">
            Web sold
          </a>
        </div>
      </section>
    </div>
  );
}

const linkClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm text-fg";
