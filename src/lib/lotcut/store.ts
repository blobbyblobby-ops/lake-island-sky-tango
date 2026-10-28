import { create } from "zustand";
import { uid, type LotItem, type Shot } from "@/lib/lotcut/types";

type Progress = { done: number; total: number; label: string } | null;

type LotStore = {
  items: LotItem[];
  selectedId: string | null;
  sample: boolean;
  progress: Progress;
  notice: string;
  setProgress: (progress: Progress) => void;
  setNotice: (notice: string) => void;
  setItems: (items: LotItem[], sample: boolean) => void;
  select: (id: string | null) => void;
  update: (id: string, patch: Partial<LotItem>) => void;
  remove: (id: string) => void;
  mergeNext: (id: string) => void;
  splitShot: (id: string, shotId: string) => void;
};

export const useLot = create<LotStore>((set, get) => ({
  items: [],
  selectedId: null,
  sample: false,
  progress: null,
  notice: "",
  setProgress: (progress) => set({ progress }),
  setNotice: (notice) => set({ notice }),
  setItems: (items, sample) => set({ items, sample, selectedId: null }),
  select: (selectedId) => set({ selectedId }),
  update: (id, patch) =>
    set({
      items: get().items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }),
  remove: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    const selectedId = get().selectedId === id ? (items[0]?.id ?? null) : get().selectedId;
    set({ items, selectedId, sample: false });
  },
  mergeNext: (id) => {
    const items = get().items;
    const index = items.findIndex((item) => item.id === id);
    const current = items[index];
    const next = items[index + 1];
    if (!current || !next) return;
    const shots: Shot[] = [...current.shots, ...next.shots].slice(0, 6);
    const merged: LotItem = {
      ...current,
      shots,
      barcode: current.barcode || next.barcode,
      barcodeFormat: current.barcodeFormat || next.barcodeFormat,
      notes: [current.notes, next.notes].filter(Boolean).join("\n"),
      status: "idle",
      research: null,
      error: "",
      titleOverride: "",
      bulletOverride: "",
      priceOverride: null,
    };
    const copy = items.slice();
    copy.splice(index, 2, merged);
    set({ items: copy, selectedId: merged.id, sample: false });
  },
  splitShot: (id, shotId) => {
    const items = get().items;
    const index = items.findIndex((item) => item.id === id);
    const current = items[index];
    if (!current || current.shots.length < 2) return;
    const shot = current.shots.find((entry) => entry.id === shotId);
    if (!shot) return;
    const remain = current.shots.filter((entry) => entry.id !== shotId);
    const spawned: LotItem = {
      ...current,
      id: uid(),
      shots: [shot],
      barcode: "",
      barcodeFormat: "",
      status: "idle",
      research: null,
      error: "",
      titleOverride: "",
      bulletOverride: "",
      priceOverride: null,
      notes: "",
    };
    const copy = items.slice();
    copy.splice(index, 1, { ...current, shots: remain, status: "idle", research: null }, spawned);
    set({ items: copy, sample: false });
  },
}));
