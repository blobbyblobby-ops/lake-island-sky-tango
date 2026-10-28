import { useEffect, useRef, useState } from "react";
import { barcodeScannerAvailable } from "@/lib/lotcut/barcodes";
import { cutVideo } from "@/lib/lotcut/cut";
import { lotTotals } from "@/lib/lotcut/fees";
import { downloadText, lotBrief, lotCsv, money } from "@/lib/lotcut/format";
import { photosToItems } from "@/lib/lotcut/photos";
import { sampleLot } from "@/lib/lotcut/sample";
import { useLot } from "@/lib/lotcut/store";
import { itemPrice, itemTitle, needsHandCheck } from "@/lib/lotcut/types";
import { writeNextBatch } from "@/lib/lotcut/write";
import { ItemDetail } from "@/components/lotcut/item-detail";
import { Button } from "@/components/lotcut/ui";

const STEPS = [
  "Film in daylight. Pause a full second on the front of each piece.",
  "Pause again on the barcode, or on a coin’s date and mint mark.",
  "Cut the video here. Nothing uploads until you write a listing.",
];

export function Studio() {
  const items = useLot((state) => state.items);
  const selectedId = useLot((state) => state.selectedId);
  const sample = useLot((state) => state.sample);
  const progress = useLot((state) => state.progress);
  const notice = useLot((state) => state.notice);
  const setItems = useLot((state) => state.setItems);
  const select = useLot((state) => state.select);
  const setNotice = useLot((state) => state.setNotice);
  const setProgress = useLot((state) => state.setProgress);

  const videoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [sensitivity, setSensitivity] = useState(55);
  const [groupWindow, setGroupWindow] = useState(0);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const totals = lotTotals(items);
  const checks = items.filter(needsHandCheck).length;
  const codes = items.filter((item) => item.barcode).length;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function replaceOk(next: string): boolean {
    if (!items.length || sample) return true;
    return window.confirm(next);
  }

  function takeVideo(file: File | undefined) {
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setVideoUrl(url);
    setFileLabel(file.name || "Camera video");
    setNotice("Pause on each item, then cut the pile.");
  }

  async function onCut() {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (!replaceOk("Replace the current lot with a new cut?")) return;
    if (video.readyState < 1) {
      try {
        await new Promise<void>((resolve, reject) => {
          const ok = () => {
            cleanup();
            resolve();
          };
          const bad = () => {
            cleanup();
            reject(new Error("Couldn't play that video. Try an MP4 or add photos."));
          };
          const cleanup = () => {
            video.removeEventListener("loadedmetadata", ok);
            video.removeEventListener("error", bad);
          };
          video.addEventListener("loadedmetadata", ok);
          video.addEventListener("error", bad);
        });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Couldn't play that video");
        return;
      }
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      const result = await cutVideo(video, {
        sensitivity,
        groupWindow,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setItems(result.items, false);
      const scan = barcodeScannerAvailable()
        ? ""
        : " This browser can't read barcodes — type them on each item.";
      setNotice(`${result.note}${scan}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setNotice("Cut cancelled");
      else setNotice(error instanceof Error ? error.message : "Couldn't cut that video");
    } finally {
      setBusy(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  async function onPhotos(list: FileList | null) {
    if (!list?.length) return;
    const addingToReal = items.length > 0 && !sample;
    setBusy(true);
    try {
      const added = await photosToItems(Array.from(list));
      if (!added.length) {
        setNotice("Those files weren't photos.");
        return;
      }
      const base = sample ? [] : items;
      setItems([...base, ...added], false);
      const where = addingToReal ? "Added" : "Loaded";
      setNotice(
        barcodeScannerAvailable()
          ? `${where} ${added.length} photo${added.length === 1 ? "" : "s"}.`
          : `${where} ${added.length} photo${added.length === 1 ? "" : "s"}. Type any barcodes this browser couldn't read.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't read those photos");
    } finally {
      setBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  function onSample() {
    if (!replaceOk("Replace the current lot with the sample bin?")) return;
    setItems(sampleLot(), true);
    setNotice("Sample bin. These prices are examples, not live comps.");
  }

  async function onWriteAll() {
    setWriting(true);
    try {
      const message = await writeNextBatch();
      setNotice(message);
    } finally {
      setWriting(false);
      setProgress(null);
    }
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(lotBrief(items));
      setNotice("Copied the lot brief");
    } catch {
      setNotice("Couldn't copy from this browser");
    }
  }

  const pct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div>
            <p className="font-display text-2xl leading-none">Lotcut</p>
            <p className="text-sm text-muted">One video. Every listing.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Likely lot</p>
            <p className="font-display text-2xl tabular-nums leading-none">{money(items.length ? totals.likely : null)}</p>
          </div>
        </div>
        <div className="h-1 bg-primary" />
      </header>

      {notice ? (
        <p className="mx-auto w-full max-w-6xl px-4 pt-4 text-sm text-muted lg:px-6" role="status">
          {notice}
        </p>
      ) : null}

      <div className="mx-auto grid w-full max-w-6xl px-4 pb-16 lg:grid-cols-3 lg:gap-6 lg:px-6">
        <section className={`flex flex-col gap-5 py-5 lg:col-span-2 ${selected ? "max-lg:hidden" : ""}`}>
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
            <div>
              <h1 className="text-3xl">Film the pile once.</h1>
              <p className="mt-2 max-w-xl text-muted">
                Toys, coins, or a mixed bin. Lotcut cuts the pauses into items, reads barcodes it can see,
                and drafts a price, a shelf, and a listing you can paste.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => videoInput.current?.click()} disabled={busy}>
                Upload video
              </Button>
              <Button onClick={() => cameraInput.current?.click()} disabled={busy}>
                Use camera
              </Button>
              <Button onClick={() => photoInput.current?.click()} disabled={busy}>
                Add photos
              </Button>
              <Button variant="quiet" onClick={onSample} disabled={busy}>
                Sample bin
              </Button>
            </div>
            <input
              ref={videoInput}
              className="sr-only"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              onChange={(event) => {
                takeVideo(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={cameraInput}
              className="sr-only"
              type="file"
              accept="video/*"
              capture="environment"
              onChange={(event) => {
                takeVideo(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={photoInput}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void onPhotos(event.target.files)}
            />

            {videoUrl ? (
              <div className="flex flex-col gap-3">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  muted
                  preload="auto"
                  className="w-full rounded-md bg-ink"
                />
                <p className="text-sm text-muted">{fileLabel}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => void onCut()} disabled={busy}>
                    {busy ? "Cutting…" : "Cut into items"}
                  </Button>
                  {busy ? (
                    <Button
                      onClick={() => abortRef.current?.abort()}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {progress ? (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-raised">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">{progress.label}</p>
              </div>
            ) : null}

            <details className="text-sm">
              <summary className="min-h-11 py-2 text-muted">How to film, and cut settings</summary>
              <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-muted">
                {STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1">
                  <span className="flex justify-between">
                    Cut sensitivity
                    <span className="tabular-nums text-fg">{sensitivity}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={sensitivity}
                    onChange={(event) => setSensitivity(Number(event.target.value))}
                    className="accent-primary"
                  />
                  <span className="text-muted">Higher splits more often. Lower if one toy becomes three items.</span>
                </label>
                <label className="grid gap-1">
                  <span className="flex justify-between">
                    Combine pauses closer than
                    <span className="tabular-nums text-fg">
                      {groupWindow === 0 ? "Off" : `${groupWindow}s`}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={groupWindow}
                    onChange={(event) => setGroupWindow(Number(event.target.value))}
                    className="accent-primary"
                  />
                  <span className="text-muted">
                    Turn this up when you pause twice on the same piece — front, then barcode. Leave it off
                    when each pause is a different item.
                  </span>
                </label>
              </div>
            </details>
          </div>

          {sample ? (
            <p className="rounded-md border border-line px-3 py-2 text-sm text-muted">
              Sample bin, not your footage. The prices are examples so you can see a finished lot. Upload a
              video or photos to replace it.
            </p>
          ) : null}

          {items.length ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Items" value={String(items.length)} />
                <Stat label="Barcodes" value={String(codes)} />
                <Stat label="Check by hand" value={String(checks)} />
              </div>
              <p className="text-sm text-muted">
                About {money(totals.net)} after the recommended fees, before shipping, on{" "}
                {totals.priced} priced item{totals.priced === 1 ? "" : "s"}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={writing || busy} onClick={() => void onWriteAll()}>
                  {writing ? "Writing…" : "Write listings"}
                </Button>
                <Button onClick={() => downloadText("lotcut.csv", lotCsv(items), "text/csv")}>
                  Export CSV
                </Button>
                <Button onClick={() => void copyBrief()}>Copy brief</Button>
              </div>
              <div className="film-edge flex gap-2 overflow-x-auto rounded-md p-3">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => select(item.id)}
                    className="w-20 shrink-0 text-left"
                  >
                    <img
                      src={item.shots[0]?.src}
                      alt=""
                      className={`aspect-square w-full rounded-sm object-cover ${item.id === selectedId ? "outline outline-2 outline-offset-2 outline-primary" : ""}`}
                    />
                    <span className="mt-1 block text-xs text-muted tabular-nums">{index + 1}</span>
                  </button>
                ))}
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id)}
                        className={`flex w-full gap-3 rounded-lg border bg-surface p-3 text-left ${active ? "border-primary" : "border-line"}`}
                      >
                        <img
                          src={item.shots[0]?.src}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-sm object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-display text-lg leading-tight">
                            {itemTitle(item)}
                          </span>
                          <span className="mt-1 block text-sm text-muted">
                            {item.barcode || "No barcode"}
                            {item.research ? ` · ${item.research.category}` : ""}
                            {item.status === "researching" ? " · writing" : ""}
                            {item.status === "error" ? " · needs a retry" : ""}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-sm bg-primary px-2 py-1 text-sm font-medium text-ink tabular-nums">
                              {money(itemPrice(item))}
                            </span>
                            {needsHandCheck(item) ? (
                              <span className="text-sm text-muted">Check by hand</span>
                            ) : null}
                            {item.shots.length > 1 ? (
                              <span className="text-sm text-muted">{item.shots.length} frames</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          <section className="flex flex-col gap-3 text-sm">
            <h2 className="text-xl">What actually moves the price</h2>
            <p className="text-muted">
              Barcoded and sealed can belong on Amazon if the item actually sells there. Opened, damaged, or
              incomplete belongs on eBay, with the flaw in the first bullet. Coins are never a stock
              description: year, mint mark, wear, and the words raw and ungraded.
            </p>
            <p className="text-muted">
              Titles that rank are specifics — brand, year, model, barcode — not adjectives. If a card is
              flagged, take it out of the batch. One wrong variant costs more than the rest of the lot.
            </p>
            <p className="text-muted">
              Sold comps are one tap away on each item. Lotcut does not pretend to have scraped eBay’s
              completed sales. Price from those searches, then use the fee table to see what you keep.
            </p>
          </section>
        </section>

        <aside
          className={`${selected ? "max-lg:fixed max-lg:inset-0 max-lg:z-30 max-lg:overflow-y-auto max-lg:bg-bg max-lg:px-4" : "hidden lg:block"} lg:col-span-1`}
        >
          <div className="detail-scroll lg:sticky lg:top-20">
            {selected ? (
              <ItemDetail item={selected} onClose={() => select(null)} />
            ) : (
              <div className="hidden py-8 lg:block">
                <h2 className="text-2xl">The lot ticket</h2>
                <p className="mt-2 text-sm text-muted">
                  Cut a video or open the sample bin. Each item gets a price band, a shelf, a fee net, and a
                  listing you can paste into eBay.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}
