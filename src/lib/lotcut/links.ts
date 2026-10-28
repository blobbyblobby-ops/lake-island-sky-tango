export function ebaySoldUrl(query: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&rt=nc`;
}

export function ebayActiveUrl(query: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
}

export function amazonUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

export function googleSoldUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} sold price`)}`;
}

export function compsQuery(title: string, barcode: string, fallback: string): string {
  const query = (fallback || title || barcode).trim();
  return query || "item";
}
