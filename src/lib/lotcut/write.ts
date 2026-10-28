import { prepareImage } from "@/lib/lotcut/photos";
import { researchListing } from "@/lib/lotcut/research";
import { useLot } from "@/lib/lotcut/store";

export async function writeListing(id: string): Promise<void> {
  const { items, update } = useLot.getState();
  const item = items.find((entry) => entry.id === id);
  if (!item || item.status === "researching") return;
  update(id, { status: "researching", error: "" });
  try {
    const imageDataUrl = item.shots[0] ? await prepareImage(item.shots[0].src) : "";
    const result = await researchListing({
      data: {
        imageDataUrl,
        barcode: item.barcode,
        notes: item.notes,
        condition: item.condition,
      },
    });
    if (!result.ok) {
      update(id, { status: "error", error: result.error });
      return;
    }
    update(id, {
      status: "ready",
      error: "",
      research: result.research,
      titleOverride: result.research.ebayTitle,
      bulletOverride: result.research.bullets.join("\n"),
      priceOverride: result.research.priceLikely,
    });
  } catch (error) {
    update(id, {
      status: "error",
      error: error instanceof Error ? error.message : "Couldn't write that listing",
    });
  }
}

export async function writeNextBatch(): Promise<string> {
  const pending = useLot
    .getState()
    .items.filter((item) => item.status === "idle" || item.status === "error")
    .slice(0, 8);
  if (!pending.length) return "Nothing left to write. Add a note and rewrite an item if you want a new draft.";
  for (let i = 0; i < pending.length; i++) {
    useLot.getState().setProgress({
      done: i,
      total: pending.length,
      label: `Writing listing ${i + 1} of ${pending.length}`,
    });
    await writeListing(pending[i].id);
  }
  useLot.getState().setProgress(null);
  const left = useLot.getState().items.filter((item) => item.status === "idle" || item.status === "error").length;
  return left
    ? `Wrote ${pending.length}. ${left} still waiting — run it again.`
    : `Wrote ${pending.length} listing${pending.length === 1 ? "" : "s"}.`;
}
