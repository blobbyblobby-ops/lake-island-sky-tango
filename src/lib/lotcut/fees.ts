import type { ChannelId, LotItem } from "@/lib/lotcut/types";
import { itemPrice } from "@/lib/lotcut/types";

export const CHANNELS: Record<
  ChannelId,
  { label: string; feeRate: number; feeFixed: number; blurb: string }
> = {
  ebay: { label: "eBay", feeRate: 0.1325, feeFixed: 0.4, blurb: "13.25% + $0.40" },
  amazon: { label: "Amazon", feeRate: 0.15, feeFixed: 0, blurb: "15% referral" },
  mercari: { label: "Mercari", feeRate: 0.1, feeFixed: 0, blurb: "10%" },
  facebook: { label: "Facebook", feeRate: 0.05, feeFixed: 0, blurb: "5% shipped" },
  whatnot: { label: "Whatnot", feeRate: 0.109, feeFixed: 0.3, blurb: "10.9% + $0.30" },
};

export const CHANNEL_ORDER: ChannelId[] = ["ebay", "amazon", "mercari", "facebook", "whatnot"];

export function netOf(price: number, id: ChannelId): number {
  const ch = CHANNELS[id];
  const net = price - price * ch.feeRate - ch.feeFixed;
  return Math.round(Math.max(0, net) * 100) / 100;
}

export function bestChannel(item: LotItem): ChannelId {
  return item.research?.channels.find((c) => c.fit === "best")?.id ?? "ebay";
}

export function lotTotals(items: LotItem[]): { likely: number; net: number; priced: number } {
  let likely = 0;
  let net = 0;
  let priced = 0;
  for (const item of items) {
    const price = itemPrice(item);
    if (price == null) continue;
    priced += 1;
    likely += price;
    net += netOf(price, bestChannel(item));
  }
  return {
    likely: Math.round(likely * 100) / 100,
    net: Math.round(net * 100) / 100,
    priced,
  };
}
