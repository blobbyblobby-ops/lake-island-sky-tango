import type { LotItem, Research } from "@/lib/lotcut/types";

function researched(partial: Research): Research {
  return partial;
}

const plush: Research = researched({
  name: "Electronic plush toy in an open box",
  ebayTitle: "Electronic Plush Owl Toy Open Box 1990s Style Untested",
  brand: "",
  category: "toy",
  year: "",
  confidence: "low",
  conditionNotes: "Box is open. Plush is seated in the tray. No brand name is readable.",
  bullets: [
    "Electronic plush owl-style toy in its retail box",
    "Box is open — do not list as sealed or new",
    "Brand and year are not readable in the photo; do not guess them",
    "Untested. Say whether it powers on before you publish",
    "Barcode not in frame",
  ],
  specifics: [
    { label: "Type", value: "Electronic plush" },
    { label: "Packaging", value: "Open box" },
    { label: "Tested", value: "No" },
  ],
  channels: [
    { id: "ebay", fit: "best", why: "Open box and an unclear brand still sell to collectors if the photos are honest." },
    { id: "mercari", fit: "good", why: "Fine for a small toy if you want a simpler listing." },
    { id: "whatnot", fit: "good", why: "Worth showing live only if you can demo the eyes or sound." },
    { id: "facebook", fit: "good", why: "Local pickup skips shipping on a bulky box." },
    { id: "amazon", fit: "avoid", why: "Open box and no confirmed UPC. Amazon will not treat this as new." },
  ],
  priceLow: 18,
  priceLikely: 28,
  priceStretch: 45,
  priceBasis: "Example band for this sample bin, not a live sold comp. Confirm with eBay sold before you list.",
  tips: [
    "First bullet should say open box and untested. Hidden caveats become returns.",
    "Add a 10-second clip of it powering on if it works — that is the price jump.",
    "Do not put a brand in the title until you can read it on the toy or the box.",
  ],
  redFlags: [
    "Brand is not identified. A wrong name here is how listings get pulled.",
    "Pull this out of a barcode batch and identify it by hand.",
  ],
  photoNeeds: ["Underside and any tag", "Close-up of the box flaps", "Power-on if it still runs"],
  compsQuery: "electronic plush owl toy open box",
  catalog: null,
});

const car: Research = researched({
  name: "Die-cast car in blister card",
  ebayTitle: "Red Die Cast Car Blister Card Sealed Loose Card Stock",
  brand: "",
  category: "toy",
  year: "",
  confidence: "medium",
  conditionNotes: "Car is sealed in a blister. The card has no readable logo. Card edges look straight.",
  bullets: [
    "Small red die-cast car sealed in a clear blister",
    "Carded, not loose",
    "No brand or series name is readable — do not invent one",
    "Light and small to ship",
  ],
  specifics: [
    { label: "Type", value: "Die-cast vehicle" },
    { label: "Packaging", value: "Blister card" },
    { label: "Scale", value: "Not shown" },
  ],
  channels: [
    { id: "ebay", fit: "best", why: "Carded die-cast sells on completed listings even without a big brand, if the photo is sharp." },
    { id: "mercari", fit: "good", why: "Easy ship, low fee, fine for a single car." },
    { id: "facebook", fit: "good", why: "Only if you are already posting a toy lot locally." },
    { id: "whatnot", fit: "avoid", why: "One common car will not carry a show by itself." },
    { id: "amazon", fit: "avoid", why: "No confirmed barcode or brand. Amazon is the wrong shelf." },
  ],
  priceLow: 8,
  priceLikely: 12,
  priceStretch: 18,
  priceBasis: "Example band for a common carded car. Check sold listings; asking prices run high.",
  tips: [
    "Photograph the blister straight on, no glare, so the casting reads.",
    "If you find a series number on the card back, put it first in the title.",
    "Ship in a rigid mailer. A crushed blister is the usual complaint.",
  ],
  redFlags: [],
  photoNeeds: ["Card back", "Blister edge to show it is sealed"],
  compsQuery: "red diecast car blister card",
  catalog: null,
});

const coin: Research = researched({
  name: "Worn silver dollar, date not readable",
  ebayTitle: "Worn Silver Dollar Raw Ungraded Date Not Readable",
  brand: "",
  category: "coin",
  year: "",
  confidence: "low",
  conditionNotes: "Profile portrait, heavy wear, dark patina. The date is not readable in this photo.",
  bullets: [
    "Raw, ungraded silver dollar",
    "Date and mint mark are NOT readable in the photo — do not invent them",
    "Heavy wear on the portrait, visible scratches, uneven patina",
    "Not professionally graded. No slab, no numeric grade",
  ],
  specifics: [
    { label: "Type", value: "Dollar coin" },
    { label: "Grade", value: "Raw, ungraded" },
    { label: "Date", value: "Not readable" },
    { label: "Mint mark", value: "Not readable" },
  ],
  channels: [
    { id: "ebay", fit: "best", why: "Raw coins live and die on sold comps plus a clear date photo." },
    { id: "whatnot", fit: "good", why: "A live close-up of the date builds trust if you can actually read it on camera." },
    { id: "mercari", fit: "good", why: "Acceptable once the date is readable. Still link your reasoning to eBay sold." },
    { id: "facebook", fit: "avoid", why: "Easy to underprice a better date to a local buyer." },
    { id: "amazon", fit: "avoid", why: "Raw coins are a poor Amazon fit and easy to mis-catalog." },
  ],
  priceLow: 25,
  priceLikely: 32,
  priceStretch: 40,
  priceBasis:
    "Example band for a common worn dollar with no readable date. This is not a key-date price. A clear date can move it a lot either way.",
  tips: [
    "Shoot the date and mint mark straight on, raking light from the side. If you cannot read it, do not list a year.",
    "Never type a grade like VF or MS. Say raw, ungraded, and describe the wear.",
    "Look up the date on a coin reference and eBay sold before you accept a common-date price.",
  ],
  redFlags: [
    "Date is unreadable. This is the item to pull out of the batch.",
    "A key date misread as common is the expensive mistake.",
  ],
  photoNeeds: ["Date at a low angle", "Mint mark under the wreath or above the date", "Edge, to show it is not damaged or cleaned"],
  compsQuery: "silver dollar raw worn",
  catalog: null,
});

const bricks: Research = researched({
  name: "Sealed brick building set, scuffed box",
  ebayTitle: "Sealed Brick Building Set Box Scuffed Corner Complete Seal",
  brand: "",
  category: "toy",
  year: "",
  confidence: "medium",
  conditionNotes: "Box looks sealed. Lower corner is scuffed. No readable set number.",
  bullets: [
    "Interlocking-brick building set, box appears sealed",
    "Scuffed lower corner — say that in the first line",
    "Set number and piece count are not readable",
    "Not mint packaging. Price it as sealed-but-shelf-worn",
  ],
  specifics: [
    { label: "Type", value: "Building set" },
    { label: "Seal", value: "Appears sealed" },
    { label: "Box", value: "Scuffed corner" },
    { label: "Set number", value: "Not shown" },
  ],
  channels: [
    { id: "ebay", fit: "best", why: "Shelf wear on the box makes eBay the honest venue. Buyers there expect photos of the damage." },
    { id: "facebook", fit: "good", why: "A bulky sealed box is cheaper to hand off locally." },
    { id: "mercari", fit: "good", why: "Works if the box is small enough that shipping does not eat the scuff discount." },
    { id: "whatnot", fit: "good", why: "Sealed sets can move on a live toy show if you show the scuff up front." },
    { id: "amazon", fit: "avoid", why: "Damaged packaging is not a new Amazon offer, even if the seal is intact." },
  ],
  priceLow: 35,
  priceLikely: 48,
  priceStretch: 70,
  priceBasis: "Example band. A real set number changes this completely — read the box before you trust any price.",
  tips: [
    "Find the set number. It belongs at the front of the title, ahead of adjectives.",
    "Photograph the scuff and the seals. Completeness claims need the seal photo.",
    "If the set number shows a retired set, check sold comps before you accept a new-in-box retail price.",
  ],
  redFlags: ["Set number is unknown. Do not batch-price this against a guess."],
  photoNeeds: ["Set number and piece count", "All seals", "The scuffed corner"],
  compsQuery: "sealed brick building set scuffed box",
  catalog: null,
});

function sampleItem(
  id: string,
  src: string,
  research: Research,
  condition: LotItem["condition"],
): LotItem {
  return {
    id,
    shots: [{ id: `${id}-shot`, t: 0, src }],
    barcode: "",
    barcodeFormat: "",
    condition,
    notes: "",
    status: "ready",
    error: "",
    research,
    titleOverride: research.ebayTitle,
    bulletOverride: research.bullets.join("\n"),
    priceOverride: research.priceLikely,
  };
}

export function sampleLot(): LotItem[] {
  return [
    sampleItem("sample-plush", "/samples/plush.jpg", plush, "good"),
    sampleItem("sample-car", "/samples/car.jpg", car, "like_new"),
    sampleItem("sample-coin", "/samples/coin.jpg", coin, "fair"),
    sampleItem("sample-bricks", "/samples/bricks.jpg", bricks, "like_new"),
  ];
}
