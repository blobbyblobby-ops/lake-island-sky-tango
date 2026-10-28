import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as Trash2, r as ArrowLeft } from "../_libs/lucide-react.mjs";
import { t as BrowserMultiFormatReader } from "../_libs/@zxing/browser+[...].mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C98WqNvM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FORMATS = [
	"upc_a",
	"upc_e",
	"ean_13",
	"ean_8",
	"code_128",
	"code_39",
	"itf",
	"qr_code"
];
var detector;
var reader = null;
function getDetector() {
	if (detector !== void 0) return detector;
	const Ctor = window.BarcodeDetector;
	if (!Ctor) {
		detector = null;
		return null;
	}
	try {
		detector = new Ctor({ formats: FORMATS });
	} catch {
		try {
			detector = new Ctor({ formats: [] });
		} catch {
			detector = null;
		}
	}
	return detector;
}
function getReader() {
	if (!reader) reader = new BrowserMultiFormatReader();
	return reader;
}
function barcodeScannerAvailable() {
	return true;
}
function rank(format) {
	if (/upc|ean|itf/i.test(format)) return 0;
	if (/128|39/i.test(format)) return 1;
	return 2;
}
function pickBarcode(hits) {
	if (!hits.length) return null;
	return [...hits].sort((a, b) => rank(a.format) - rank(b.format))[0] ?? null;
}
async function nativeDetect(canvas) {
	const api = getDetector();
	if (!api) return [];
	try {
		return (await api.detect(canvas)).map((hit) => ({
			raw: (hit.rawValue ?? "").trim(),
			format: hit.format || "unknown"
		})).filter((hit) => hit.raw.length > 0);
	} catch {
		return [];
	}
}
async function detectOnCanvas(canvas) {
	const native = await nativeDetect(canvas);
	if (native.length) return native;
	try {
		const result = getReader().decodeFromCanvas(canvas);
		const raw = result.getText().trim();
		if (!raw) return [];
		return [{
			raw,
			format: String(result.getBarcodeFormat())
		}];
	} catch {
		return [];
	}
}
function loadImage$1(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error("Couldn't read that photo"));
		img.src = src;
	});
}
async function detectBarcodeFromSrc(src) {
	const img = await loadImage$1(src);
	const canvas = document.createElement("canvas");
	const scale = Math.min(1, 960 / Math.max(img.naturalWidth, 1));
	canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
	canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return pickBarcode(await detectOnCanvas(canvas));
}
function uid() {
	return Math.random().toString(36).slice(2, 10);
}
function blankItem(shots, barcode = "", barcodeFormat = "") {
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
		priceOverride: null
	};
}
function itemTitle(item) {
	const custom = item.titleOverride.trim();
	if (custom) return custom;
	return item.research?.ebayTitle || item.research?.name || "Untitled item";
}
function itemBullets(item) {
	return (item.bulletOverride.trim() ? item.bulletOverride : (item.research?.bullets ?? []).join("\n")).split("\n").map((line) => line.replace(/^•\s*/, "").trim()).filter(Boolean);
}
function itemPrice(item) {
	if (item.priceOverride != null && Number.isFinite(item.priceOverride)) return item.priceOverride;
	if (item.research) return item.research.priceLikely;
	return null;
}
function needsHandCheck(item) {
	const research = item.research;
	if (!research) return false;
	if (research.redFlags.length > 0) return true;
	if (research.confidence === "low") return true;
	if (research.category === "coin") return true;
	if (research.priceLikely >= 80) return true;
	return false;
}
var MAX_DURATION = 180;
var MAX_SAMPLES = 150;
function gridOf(ctx, cols = 16, rows = 9) {
	const { width, height } = ctx.canvas;
	const data = ctx.getImageData(0, 0, width, height).data;
	const grid = new Uint8Array(cols * rows);
	for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
		const sx = Math.min(width - 1, Math.floor((x + .5) / cols * width));
		const i = (Math.min(height - 1, Math.floor((y + .5) / rows * height)) * width + sx) * 4;
		grid[y * cols + x] = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114 | 0;
	}
	return grid;
}
function meanLuma(grid) {
	let sum = 0;
	for (const value of grid) sum += value;
	return sum / grid.length;
}
function gridDiff(a, b) {
	let sum = 0;
	for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
	return sum / a.length;
}
function sharpnessOf(ctx) {
	const { width, height } = ctx.canvas;
	const data = ctx.getImageData(0, 0, width, height).data;
	const gray = (x, y) => {
		const i = (y * width + x) * 4;
		return data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
	};
	let sum = 0;
	let sum2 = 0;
	let n = 0;
	for (let y = 1; y < height - 1; y += 3) for (let x = 1; x < width - 1; x += 3) {
		const g = gray(x, y) * 4 - gray(x - 1, y) - gray(x + 1, y) - gray(x, y - 1) - gray(x, y + 1);
		sum += g;
		sum2 += g * g;
		n += 1;
	}
	if (!n) return 0;
	const mean = sum / n;
	return sum2 / n - mean * mean;
}
function seekTo(video, time) {
	return new Promise((resolve, reject) => {
		const target = Math.min(Math.max(time, 0), Math.max((video.duration || 0) - .04, 0));
		if (Math.abs(video.currentTime - target) < .03 && video.readyState >= 2) {
			resolve();
			return;
		}
		const done = () => {
			cleanup();
			resolve();
		};
		const fail = () => {
			cleanup();
			reject(/* @__PURE__ */ new Error("Couldn't step through that video"));
		};
		const cleanup = () => {
			video.removeEventListener("seeked", done);
			video.removeEventListener("error", fail);
		};
		video.addEventListener("seeked", done);
		video.addEventListener("error", fail);
		video.currentTime = target;
	});
}
async function paint(video) {
	await new Promise((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
	});
}
function draw(video, maxW) {
	const scale = Math.min(1, maxW / Math.max(video.videoWidth, 1));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
	canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("This browser can't read video frames");
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	return ctx;
}
function median(values) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
function buildRuns(samples, threshold) {
	const runs = [];
	let cur = null;
	for (let i = 0; i < samples.length; i++) {
		const sample = samples[i];
		const prev = samples[i - 1];
		const delta = prev ? gridDiff(prev.grid, sample.grid) : 0;
		if (!cur || delta > threshold) {
			if (cur) runs.push(cur);
			cur = {
				t0: sample.t,
				t1: sample.t,
				bestT: sample.t,
				bestSharp: sample.sharp
			};
		} else {
			cur.t1 = sample.t;
			if (sample.sharp >= cur.bestSharp) {
				cur.bestSharp = sample.sharp;
				cur.bestT = sample.t;
			}
		}
	}
	if (cur) runs.push(cur);
	return runs;
}
function keepRuns(runs) {
	if (runs.length <= 1) return runs;
	const mid = median(runs.map((run) => run.bestSharp));
	const kept = runs.filter((run) => run.bestSharp >= mid * .45);
	if (kept.length < Math.ceil(runs.length * .3)) return runs;
	return kept;
}
function groupRuns(runs, windowSec) {
	if (windowSec <= 0) return runs.map((run) => [run]);
	const groups = [];
	for (const run of runs) {
		const last = groups[groups.length - 1];
		const prev = last?.[last.length - 1];
		if (prev && run.t0 - prev.t1 <= windowSec && last.length < 4) last.push(run);
		else groups.push([run]);
	}
	return groups;
}
async function cutVideo(video, opts) {
	if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("That file has no duration. Try an MP4, or add photos instead.");
	if (!video.videoWidth) throw new Error("Couldn't read the picture in that video.");
	const clipped = video.duration > MAX_DURATION;
	const duration = Math.min(video.duration, MAX_DURATION);
	let step = .5;
	if (duration / step > MAX_SAMPLES) step = duration / MAX_SAMPLES;
	const times = [];
	for (let t = .08; t < duration - .04; t += step) times.push(t);
	if (!times.length) times.push(0);
	const samples = [];
	for (let i = 0; i < times.length; i++) {
		if (opts.signal.aborted) throw new DOMException("Cancelled", "AbortError");
		opts.onProgress({
			done: i,
			total: times.length,
			label: "Sampling the video"
		});
		await seekTo(video, times[i]);
		await paint(video);
		const ctx = draw(video, 240);
		const grid = gridOf(ctx);
		if (meanLuma(grid) < 10) continue;
		samples.push({
			t: times[i],
			grid,
			sharp: sharpnessOf(ctx)
		});
	}
	if (!samples.length) throw new Error("Those frames were too dark to cut. Add a lamp and film again.");
	const groups = groupRuns(keepRuns(buildRuns(samples, 30 - Math.min(100, Math.max(1, opts.sensitivity)) / 100 * 24)), opts.groupWindow).slice(0, 60);
	const items = [];
	for (let g = 0; g < groups.length; g++) {
		if (opts.signal.aborted) throw new DOMException("Cancelled", "AbortError");
		opts.onProgress({
			done: g,
			total: groups.length,
			label: "Reading frames and barcodes"
		});
		const shots = [];
		let barcode = "";
		let barcodeFormat = "";
		for (const run of groups[g]) {
			await seekTo(video, run.bestT);
			await paint(video);
			const ctx = draw(video, 960);
			const hit = pickBarcode(await detectOnCanvas(ctx.canvas));
			if (hit && !barcode) {
				barcode = hit.raw;
				barcodeFormat = hit.format;
			}
			shots.push({
				id: uid(),
				t: run.bestT,
				src: ctx.canvas.toDataURL("image/jpeg", .72)
			});
		}
		items.push(blankItem(shots, barcode, barcodeFormat));
	}
	if (!items.length) throw new Error("No items found. Pause for a second on each piece, or add photos.");
	const noun = items.length === 1 ? "item" : "items";
	const grouped = opts.groupWindow > 0;
	return {
		items,
		note: [clipped ? "Only the first 3 minutes were cut." : "", grouped ? `Cut into ${items.length} ${noun}. Pauses within ${opts.groupWindow}s were kept together — split any that are different pieces.` : `Cut into ${items.length} ${noun}, one per pause. If the barcode was a second pause, tap Same as next.`].filter(Boolean).join(" ")
	};
}
var CHANNELS = {
	ebay: {
		label: "eBay",
		feeRate: .1325,
		feeFixed: .4,
		blurb: "13.25% + $0.40"
	},
	amazon: {
		label: "Amazon",
		feeRate: .15,
		feeFixed: 0,
		blurb: "15% referral"
	},
	mercari: {
		label: "Mercari",
		feeRate: .1,
		feeFixed: 0,
		blurb: "10%"
	},
	facebook: {
		label: "Facebook",
		feeRate: .05,
		feeFixed: 0,
		blurb: "5% shipped"
	},
	whatnot: {
		label: "Whatnot",
		feeRate: .109,
		feeFixed: .3,
		blurb: "10.9% + $0.30"
	}
};
var CHANNEL_ORDER = [
	"ebay",
	"amazon",
	"mercari",
	"facebook",
	"whatnot"
];
function netOf(price, id) {
	const ch = CHANNELS[id];
	const net = price - price * ch.feeRate - ch.feeFixed;
	return Math.round(Math.max(0, net) * 100) / 100;
}
function bestChannel(item) {
	return item.research?.channels.find((c) => c.fit === "best")?.id ?? "ebay";
}
function lotTotals(items) {
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
		priced
	};
}
function money(n) {
	if (n == null || !Number.isFinite(n)) return "—";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD"
	}).format(n);
}
function clock(t) {
	const s = Math.max(0, Math.round(t));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function listingText(item) {
	const lines = [
		itemTitle(item),
		"",
		...itemBullets(item).map((line) => `• ${line}`)
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
function lotBrief(items) {
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
		lines.push(`${itemTitle(item)} — ${price == null ? "unpriced" : money(price)} · ${channel}${flag}`);
		if (item.barcode) lines.push(`  Barcode ${item.barcode}`);
	}
	lines.push("", `Likely total ${money(likely)} · about ${money(net)} after the recommended channel fee, before shipping.`, "", "Prices are estimates and catalog offers, not a live scrape of sold listings. Open the sold search before you publish.", "", items.map((item) => listingText(item)).join("\n\n---\n\n"));
	return lines.join("\n");
}
function csvCell(value) {
	if (/[",\n]/.test(value)) return `"${value.replace(/"/g, "\"\"")}"`;
	return value;
}
function lotCsv(items) {
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
		"Hand check"
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
			needsHandCheck(item) ? "yes" : ""
		].map(csvCell);
	});
	return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
function downloadText(filename, text, mime) {
	const blob = new Blob([text], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error("Couldn't read that photo"));
		img.src = src;
	});
}
async function fileToShot(file) {
	const url = URL.createObjectURL(file);
	try {
		const img = await loadImage(url);
		const canvas = document.createElement("canvas");
		const scale = Math.min(1, 960 / Math.max(img.naturalWidth, 1));
		canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
		canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("This browser can't read photos");
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		const barcode = pickBarcode(await detectOnCanvas(canvas));
		return {
			shot: {
				id: uid(),
				t: 0,
				src: canvas.toDataURL("image/jpeg", .72)
			},
			barcode
		};
	} finally {
		URL.revokeObjectURL(url);
	}
}
async function photosToItems(files) {
	const items = [];
	for (const file of files) {
		if (!file.type.startsWith("image/")) continue;
		const { shot, barcode } = await fileToShot(file);
		items.push(blankItem([shot], barcode?.raw ?? "", barcode?.format ?? ""));
	}
	return items;
}
async function prepareImage(src) {
	const img = await loadImage(src);
	const scale = Math.min(1, 720 / Math.max(img.naturalWidth, 1));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
	canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Couldn't prepare the photo");
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	let quality = .68;
	let url = canvas.toDataURL("image/jpeg", quality);
	while (url.length > 9e5 && quality > .4) {
		quality -= .08;
		url = canvas.toDataURL("image/jpeg", quality);
	}
	return url;
}
function researched(partial) {
	return partial;
}
var plush = researched({
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
		"Barcode not in frame"
	],
	specifics: [
		{
			label: "Type",
			value: "Electronic plush"
		},
		{
			label: "Packaging",
			value: "Open box"
		},
		{
			label: "Tested",
			value: "No"
		}
	],
	channels: [
		{
			id: "ebay",
			fit: "best",
			why: "Open box and an unclear brand still sell to collectors if the photos are honest."
		},
		{
			id: "mercari",
			fit: "good",
			why: "Fine for a small toy if you want a simpler listing."
		},
		{
			id: "whatnot",
			fit: "good",
			why: "Worth showing live only if you can demo the eyes or sound."
		},
		{
			id: "facebook",
			fit: "good",
			why: "Local pickup skips shipping on a bulky box."
		},
		{
			id: "amazon",
			fit: "avoid",
			why: "Open box and no confirmed UPC. Amazon will not treat this as new."
		}
	],
	priceLow: 18,
	priceLikely: 28,
	priceStretch: 45,
	priceBasis: "Example band for this sample bin, not a live sold comp. Confirm with eBay sold before you list.",
	tips: [
		"First bullet should say open box and untested. Hidden caveats become returns.",
		"Add a 10-second clip of it powering on if it works — that is the price jump.",
		"Do not put a brand in the title until you can read it on the toy or the box."
	],
	redFlags: ["Brand is not identified. A wrong name here is how listings get pulled.", "Pull this out of a barcode batch and identify it by hand."],
	photoNeeds: [
		"Underside and any tag",
		"Close-up of the box flaps",
		"Power-on if it still runs"
	],
	compsQuery: "electronic plush owl toy open box",
	catalog: null
});
var car = researched({
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
		"Light and small to ship"
	],
	specifics: [
		{
			label: "Type",
			value: "Die-cast vehicle"
		},
		{
			label: "Packaging",
			value: "Blister card"
		},
		{
			label: "Scale",
			value: "Not shown"
		}
	],
	channels: [
		{
			id: "ebay",
			fit: "best",
			why: "Carded die-cast sells on completed listings even without a big brand, if the photo is sharp."
		},
		{
			id: "mercari",
			fit: "good",
			why: "Easy ship, low fee, fine for a single car."
		},
		{
			id: "facebook",
			fit: "good",
			why: "Only if you are already posting a toy lot locally."
		},
		{
			id: "whatnot",
			fit: "avoid",
			why: "One common car will not carry a show by itself."
		},
		{
			id: "amazon",
			fit: "avoid",
			why: "No confirmed barcode or brand. Amazon is the wrong shelf."
		}
	],
	priceLow: 8,
	priceLikely: 12,
	priceStretch: 18,
	priceBasis: "Example band for a common carded car. Check sold listings; asking prices run high.",
	tips: [
		"Photograph the blister straight on, no glare, so the casting reads.",
		"If you find a series number on the card back, put it first in the title.",
		"Ship in a rigid mailer. A crushed blister is the usual complaint."
	],
	redFlags: [],
	photoNeeds: ["Card back", "Blister edge to show it is sealed"],
	compsQuery: "red diecast car blister card",
	catalog: null
});
var coin = researched({
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
		"Not professionally graded. No slab, no numeric grade"
	],
	specifics: [
		{
			label: "Type",
			value: "Dollar coin"
		},
		{
			label: "Grade",
			value: "Raw, ungraded"
		},
		{
			label: "Date",
			value: "Not readable"
		},
		{
			label: "Mint mark",
			value: "Not readable"
		}
	],
	channels: [
		{
			id: "ebay",
			fit: "best",
			why: "Raw coins live and die on sold comps plus a clear date photo."
		},
		{
			id: "whatnot",
			fit: "good",
			why: "A live close-up of the date builds trust if you can actually read it on camera."
		},
		{
			id: "mercari",
			fit: "good",
			why: "Acceptable once the date is readable. Still link your reasoning to eBay sold."
		},
		{
			id: "facebook",
			fit: "avoid",
			why: "Easy to underprice a better date to a local buyer."
		},
		{
			id: "amazon",
			fit: "avoid",
			why: "Raw coins are a poor Amazon fit and easy to mis-catalog."
		}
	],
	priceLow: 25,
	priceLikely: 32,
	priceStretch: 40,
	priceBasis: "Example band for a common worn dollar with no readable date. This is not a key-date price. A clear date can move it a lot either way.",
	tips: [
		"Shoot the date and mint mark straight on, raking light from the side. If you cannot read it, do not list a year.",
		"Never type a grade like VF or MS. Say raw, ungraded, and describe the wear.",
		"Look up the date on a coin reference and eBay sold before you accept a common-date price."
	],
	redFlags: ["Date is unreadable. This is the item to pull out of the batch.", "A key date misread as common is the expensive mistake."],
	photoNeeds: [
		"Date at a low angle",
		"Mint mark under the wreath or above the date",
		"Edge, to show it is not damaged or cleaned"
	],
	compsQuery: "silver dollar raw worn",
	catalog: null
});
var bricks = researched({
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
		"Not mint packaging. Price it as sealed-but-shelf-worn"
	],
	specifics: [
		{
			label: "Type",
			value: "Building set"
		},
		{
			label: "Seal",
			value: "Appears sealed"
		},
		{
			label: "Box",
			value: "Scuffed corner"
		},
		{
			label: "Set number",
			value: "Not shown"
		}
	],
	channels: [
		{
			id: "ebay",
			fit: "best",
			why: "Shelf wear on the box makes eBay the honest venue. Buyers there expect photos of the damage."
		},
		{
			id: "facebook",
			fit: "good",
			why: "A bulky sealed box is cheaper to hand off locally."
		},
		{
			id: "mercari",
			fit: "good",
			why: "Works if the box is small enough that shipping does not eat the scuff discount."
		},
		{
			id: "whatnot",
			fit: "good",
			why: "Sealed sets can move on a live toy show if you show the scuff up front."
		},
		{
			id: "amazon",
			fit: "avoid",
			why: "Damaged packaging is not a new Amazon offer, even if the seal is intact."
		}
	],
	priceLow: 35,
	priceLikely: 48,
	priceStretch: 70,
	priceBasis: "Example band. A real set number changes this completely — read the box before you trust any price.",
	tips: [
		"Find the set number. It belongs at the front of the title, ahead of adjectives.",
		"Photograph the scuff and the seals. Completeness claims need the seal photo.",
		"If the set number shows a retired set, check sold comps before you accept a new-in-box retail price."
	],
	redFlags: ["Set number is unknown. Do not batch-price this against a guess."],
	photoNeeds: [
		"Set number and piece count",
		"All seals",
		"The scuffed corner"
	],
	compsQuery: "sealed brick building set scuffed box",
	catalog: null
});
function sampleItem(id, src, research, condition) {
	return {
		id,
		shots: [{
			id: `${id}-shot`,
			t: 0,
			src
		}],
		barcode: "",
		barcodeFormat: "",
		condition,
		notes: "",
		status: "ready",
		error: "",
		research,
		titleOverride: research.ebayTitle,
		bulletOverride: research.bullets.join("\n"),
		priceOverride: research.priceLikely
	};
}
function sampleLot() {
	return [
		sampleItem("sample-plush", "/samples/plush.jpg", plush, "good"),
		sampleItem("sample-car", "/samples/car.jpg", car, "like_new"),
		sampleItem("sample-coin", "/samples/coin.jpg", coin, "fair"),
		sampleItem("sample-bricks", "/samples/bricks.jpg", bricks, "like_new")
	];
}
var useLot = create((set, get) => ({
	items: [],
	selectedId: null,
	sample: false,
	progress: null,
	notice: "",
	setProgress: (progress) => set({ progress }),
	setNotice: (notice) => set({ notice }),
	setItems: (items, sample) => set({
		items,
		sample,
		selectedId: null
	}),
	select: (selectedId) => set({ selectedId }),
	update: (id, patch) => set({ items: get().items.map((item) => item.id === id ? {
		...item,
		...patch
	} : item) }),
	remove: (id) => {
		const items = get().items.filter((item) => item.id !== id);
		set({
			items,
			selectedId: get().selectedId === id ? items[0]?.id ?? null : get().selectedId,
			sample: false
		});
	},
	mergeNext: (id) => {
		const items = get().items;
		const index = items.findIndex((item) => item.id === id);
		const current = items[index];
		const next = items[index + 1];
		if (!current || !next) return;
		const shots = [...current.shots, ...next.shots].slice(0, 6);
		const merged = {
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
			priceOverride: null
		};
		const copy = items.slice();
		copy.splice(index, 2, merged);
		set({
			items: copy,
			selectedId: merged.id,
			sample: false
		});
	},
	splitShot: (id, shotId) => {
		const items = get().items;
		const index = items.findIndex((item) => item.id === id);
		const current = items[index];
		if (!current || current.shots.length < 2) return;
		const shot = current.shots.find((entry) => entry.id === shotId);
		if (!shot) return;
		const remain = current.shots.filter((entry) => entry.id !== shotId);
		const spawned = {
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
			notes: ""
		};
		const copy = items.slice();
		copy.splice(index, 1, {
			...current,
			shots: remain,
			status: "idle",
			research: null
		}, spawned);
		set({
			items: copy,
			sample: false
		});
	}
}));
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function clip(value, max) {
	if (typeof value !== "string") return "";
	return value.replace(/\s+/g, " ").trim().slice(0, max);
}
function parseInput(data) {
	if (!data || typeof data !== "object") throw new Error("Missing item");
	const row = data;
	const imageDataUrl = typeof row.imageDataUrl === "string" ? row.imageDataUrl : "";
	const barcode = clip(row.barcode, 32);
	const notes = clip(row.notes, 500);
	const condition = clip(row.condition, 24) || "unknown";
	if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) throw new Error("Photo was not a usable image");
	if (imageDataUrl.length > 12e5) throw new Error("Photo is too large");
	if (!imageDataUrl && barcode.length < 8) throw new Error("Add a photo or a barcode first");
	return {
		imageDataUrl,
		barcode,
		notes,
		condition
	};
}
var researchListing = createServerFn({ method: "POST" }).validator(parseInput).handler(createSsrRpc("03babb525806259344f0cc3d6f0c2f25413f6d8573c2c6c0033c4177a7604d59"));
async function writeListing(id) {
	const { items, update } = useLot.getState();
	const item = items.find((entry) => entry.id === id);
	if (!item || item.status === "researching") return;
	update(id, {
		status: "researching",
		error: ""
	});
	try {
		const result = await researchListing({ data: {
			imageDataUrl: item.shots[0] ? await prepareImage(item.shots[0].src) : "",
			barcode: item.barcode,
			notes: item.notes,
			condition: item.condition
		} });
		if (!result.ok) {
			update(id, {
				status: "error",
				error: result.error
			});
			return;
		}
		update(id, {
			status: "ready",
			error: "",
			research: result.research,
			titleOverride: result.research.ebayTitle,
			bulletOverride: result.research.bullets.join("\n"),
			priceOverride: result.research.priceLikely
		});
	} catch (error) {
		update(id, {
			status: "error",
			error: error instanceof Error ? error.message : "Couldn't write that listing"
		});
	}
}
async function writeNextBatch() {
	const pending = useLot.getState().items.filter((item) => item.status === "idle" || item.status === "error").slice(0, 8);
	if (!pending.length) return "Nothing left to write. Add a note and rewrite an item if you want a new draft.";
	for (let i = 0; i < pending.length; i++) {
		useLot.getState().setProgress({
			done: i,
			total: pending.length,
			label: `Writing listing ${i + 1} of ${pending.length}`
		});
		await writeListing(pending[i].id);
	}
	useLot.getState().setProgress(null);
	const left = useLot.getState().items.filter((item) => item.status === "idle" || item.status === "error").length;
	return left ? `Wrote ${pending.length}. ${left} still waiting — run it again.` : `Wrote ${pending.length} listing${pending.length === 1 ? "" : "s"}.`;
}
function ebaySoldUrl(query) {
	return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&rt=nc`;
}
function ebayActiveUrl(query) {
	return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
}
function amazonUrl(query) {
	return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}
function googleSoldUrl(query) {
	return `https://www.google.com/search?q=${encodeURIComponent(`${query} sold price`)}`;
}
function compsQuery(title, barcode, fallback) {
	return (fallback || title || barcode).trim() || "item";
}
var VARIANTS = {
	primary: "bg-primary text-ink",
	ghost: "border border-line bg-surface text-fg",
	quiet: "bg-transparent text-fg px-2"
};
function Button({ variant = "ghost", className = "", type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`,
		...props
	});
}
function FieldLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-sm text-muted",
		children
	});
}
var fieldClass = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none";
var CONDITIONS = [
	{
		id: "new",
		label: "New / sealed"
	},
	{
		id: "like_new",
		label: "Like new"
	},
	{
		id: "good",
		label: "Good"
	},
	{
		id: "fair",
		label: "Fair"
	},
	{
		id: "poor",
		label: "Poor"
	},
	{
		id: "unknown",
		label: "Not sure"
	}
];
var FIT_LABEL = {
	best: "Best shelf",
	good: "Works",
	avoid: "Skip"
};
function adviceFor(item, id) {
	return item.research?.channels.find((channel) => channel.id === id);
}
function ItemDetail({ item, onClose }) {
	const update = useLot((state) => state.update);
	const remove = useLot((state) => state.remove);
	const mergeNext = useLot((state) => state.mergeNext);
	const splitShot = useLot((state) => state.splitShot);
	const setNotice = useLot((state) => state.setNotice);
	const hasNext = useLot((state) => {
		const index = state.items.findIndex((entry) => entry.id === item.id);
		return index >= 0 && index < state.items.length - 1;
	});
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [priceText, setPriceText] = (0, import_react.useState)("");
	const price = itemPrice(item);
	const title = itemTitle(item);
	const titleCount = item.titleOverride.length;
	const query = compsQuery(title, item.barcode, item.research?.compsQuery ?? "");
	const hand = needsHandCheck(item);
	const typedPrice = priceText.trim() === "" ? null : Number(priceText);
	const shownPrice = typedPrice != null && Number.isFinite(typedPrice) ? typedPrice : price;
	(0, import_react.useEffect)(() => {
		const next = item.priceOverride ?? item.research?.priceLikely ?? null;
		setPriceText(next == null ? "" : String(next));
	}, [
		item.id,
		item.status,
		item.priceOverride,
		item.research?.priceLikely
	]);
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
					update(item.id, {
						barcode: hit.raw,
						barcodeFormat: hit.format
					});
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 py-4 lg:py-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 lg:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "quiet",
					onClick: onClose,
					className: "px-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {
						className: "size-4",
						"aria-hidden": "true"
					}), "Lot"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "quiet",
					onClick: () => {
						remove(item.id);
						onClose();
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
						className: "size-4",
						"aria-hidden": "true"
					}), "Drop"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [item.research?.category ?? "Unresearched", item.research ? ` · ${item.research.confidence} confidence` : ""]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 text-2xl",
				children: item.research?.name || "New cut"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "film-edge flex gap-2 overflow-x-auto rounded-md p-3",
				children: item.shots.map((shot) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
					className: "w-36 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: shot.src,
						alt: "",
						className: "aspect-square w-full rounded-sm object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figcaption", {
						className: "mt-1 flex items-center justify-between text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							children: shot.t > 0 ? clock(shot.t) : "Photo"
						}), item.shots.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 px-1 text-fg",
							onClick: () => splitShot(item.id, shot.id),
							children: "Split"
						}) : null]
					})]
				}, shot.id))
			}),
			hand ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-primary bg-surface px-3 py-2 text-sm",
				children: "Pull this one out of the batch and check it by hand before you price it."
			}) : null,
			item.research?.redFlags.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-1 text-sm",
				children: item.research.redFlags.map((flag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: flag }, flag))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Barcode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: `${fieldClass} font-mono`,
							value: item.barcode,
							inputMode: "numeric",
							autoComplete: "off",
							onChange: (event) => update(item.id, { barcode: event.target.value.trim() }),
							placeholder: "Type the UPC if the frame missed it"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Condition" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: fieldClass,
							value: item.condition,
							onChange: (event) => update(item.id, { condition: event.target.value }),
							children: CONDITIONS.map((condition) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: condition.id,
								children: condition.label
							}, condition.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Notes for the rewrite" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: fieldClass,
							rows: 3,
							value: item.notes,
							onChange: (event) => update(item.id, { notes: event.target.value }),
							placeholder: "Mint mark looks like D. Box corner is crushed. Missing the poster."
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "primary",
						disabled: item.status === "researching",
						onClick: () => void writeListing(item.id),
						children: item.status === "researching" ? "Writing…" : item.research ? "Rewrite listing" : "Write listing"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => void readCode(),
						disabled: scanning,
						children: scanning ? "Scanning…" : "Read barcode"
					}),
					hasNext ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => mergeNext(item.id),
						children: "Same as next"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "hidden lg:inline-flex",
						onClick: () => remove(item.id),
						children: "Drop item"
					})
				]
			}),
			item.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm",
				children: item.error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xl",
							children: "Price"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted tabular-nums",
							children: item.research ? `${money(item.research.priceLow)} – ${money(item.research.priceStretch)}` : "No band yet"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Your price" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: `${fieldClass} tabular-nums`,
							inputMode: "decimal",
							value: priceText,
							onChange: (event) => setPriceText(event.target.value),
							onBlur: () => {
								if (priceText.trim() === "") {
									update(item.id, { priceOverride: null });
									return;
								}
								const next = Number(priceText);
								if (Number.isFinite(next)) update(item.id, { priceOverride: next });
							}
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: item.research?.priceBasis || "Write the listing for a range. Nothing here is a live eBay or Amazon sold price."
					}),
					item.research?.catalog ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							"Catalog: ",
							item.research.catalog.title,
							item.research.catalog.lowest != null ? ` · recorded low ${money(item.research.catalog.lowest)}` : ""
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [CHANNEL_ORDER.map((id) => {
						const advice = adviceFor(item, id);
						const net = shownPrice == null ? null : netOf(shownPrice, id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-line py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm font-medium",
									children: [CHANNELS[id].label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-muted",
										children: CHANNELS[id].blurb
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular-nums",
									children: money(net)
								})]
							}), advice ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: advice.fit === "best" ? "text-primary" : "",
										children: [FIT_LABEL[advice.fit], "."]
									}),
									" ",
									advice.why
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: "Net after the typical fee, before shipping."
							})]
						}, id);
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Fees are typical US rates, not your seller invoice. Shipping, tax, and promoted listings are extra."
					})] })
				]
			}),
			item.research?.category === "coin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-md bg-raised px-3 py-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-lg",
					children: "Coin rules"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: "Do not assign a grade. Say raw and ungraded, then the year, mint mark, and the wear you can see. A blurry date is not a listing yet. Check a coin reference and eBay sold before you accept a common-date price."
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-md bg-raised px-3 py-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-lg",
					children: "Toy rules"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: "Box, seal, and completeness move the price more than the title. New and sealed can belong on Amazon. Opened, damaged, or incomplete belongs on eBay, and the flaw goes in the first bullet."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xl",
						children: "Listing"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center justify-between text-sm text-muted",
								children: ["eBay title", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums",
									children: [titleCount, "/80"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: item.titleOverride,
								maxLength: 120,
								onChange: (event) => update(item.id, { titleOverride: event.target.value }),
								placeholder: "Brand, name, the variant that changes the price"
							}),
							titleCount > 80 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: "Trim it. eBay titles cut off after 80 characters."
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Bullets — facts only" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: fieldClass,
							rows: 6,
							value: item.bulletOverride,
							onChange: (event) => update(item.id, { bulletOverride: event.target.value }),
							placeholder: "Brand and model\nYear, if you can see it\nBarcode\nWhat is included and what is not"
						})]
					}),
					item.research?.specifics.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
						className: "grid grid-cols-2 gap-x-3 gap-y-2 text-sm",
						children: item.research.specifics.map((spec) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted",
							children: spec.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: spec.value })] }, spec.label))
					}) : null,
					item.research?.photoNeeds.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: ["Still shoot: ", item.research.photoNeeds.join(" · ")]
					}) : null,
					item.research?.tips.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-2 text-sm",
						children: item.research.tips.map((tip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: tip }, tip))
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "primary",
								onClick: () => void copyListing(),
								disabled: !title && !itemBullets(item).length,
								children: "Copy listing"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: linkClass,
								href: ebaySoldUrl(query),
								target: "_blank",
								rel: "noreferrer",
								children: "eBay sold"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: linkClass,
								href: ebayActiveUrl(query),
								target: "_blank",
								rel: "noreferrer",
								children: "eBay asking"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: linkClass,
								href: amazonUrl(item.barcode || query),
								target: "_blank",
								rel: "noreferrer",
								children: "Amazon"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: linkClass,
								href: googleSoldUrl(query),
								target: "_blank",
								rel: "noreferrer",
								children: "Web sold"
							})
						]
					})
				]
			})
		]
	});
}
var linkClass = "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm text-fg";
var STEPS = [
	"Film in daylight. Pause a full second on the front of each piece.",
	"Pause again on the barcode, or on a coin’s date and mint mark.",
	"Cut the video here. Nothing uploads until you write a listing."
];
function Studio() {
	const items = useLot((state) => state.items);
	const selectedId = useLot((state) => state.selectedId);
	const sample = useLot((state) => state.sample);
	const progress = useLot((state) => state.progress);
	const notice = useLot((state) => state.notice);
	const setItems = useLot((state) => state.setItems);
	const select = useLot((state) => state.select);
	const setNotice = useLot((state) => state.setNotice);
	const setProgress = useLot((state) => state.setProgress);
	const videoRef = (0, import_react.useRef)(null);
	const abortRef = (0, import_react.useRef)(null);
	const urlRef = (0, import_react.useRef)(null);
	const videoInput = (0, import_react.useRef)(null);
	const cameraInput = (0, import_react.useRef)(null);
	const photoInput = (0, import_react.useRef)(null);
	const [videoUrl, setVideoUrl] = (0, import_react.useState)(null);
	const [fileLabel, setFileLabel] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [writing, setWriting] = (0, import_react.useState)(false);
	const [sensitivity, setSensitivity] = (0, import_react.useState)(55);
	const [groupWindow, setGroupWindow] = (0, import_react.useState)(0);
	const selected = items.find((item) => item.id === selectedId) ?? null;
	const totals = lotTotals(items);
	const checks = items.filter(needsHandCheck).length;
	const codes = items.filter((item) => item.barcode).length;
	(0, import_react.useEffect)(() => {
		if (!notice) return;
		const timer = window.setTimeout(() => setNotice(""), 5e3);
		return () => window.clearTimeout(timer);
	}, [notice, setNotice]);
	(0, import_react.useEffect)(() => {
		return () => {
			if (urlRef.current) URL.revokeObjectURL(urlRef.current);
		};
	}, []);
	function replaceOk(next) {
		if (!items.length || sample) return true;
		return window.confirm(next);
	}
	function takeVideo(file) {
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
		if (video.readyState < 1) try {
			await new Promise((resolve, reject) => {
				const ok = () => {
					cleanup();
					resolve();
				};
				const bad = () => {
					cleanup();
					reject(/* @__PURE__ */ new Error("Couldn't play that video. Try an MP4 or add photos."));
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
		const controller = new AbortController();
		abortRef.current = controller;
		setBusy(true);
		try {
			const result = await cutVideo(video, {
				sensitivity,
				groupWindow,
				signal: controller.signal,
				onProgress: setProgress
			});
			setItems(result.items, false);
			const scan = barcodeScannerAvailable() ? "" : " This browser can't read barcodes — type them on each item.";
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
	async function onPhotos(list) {
		if (!list?.length) return;
		const addingToReal = items.length > 0 && !sample;
		setBusy(true);
		try {
			const added = await photosToItems(Array.from(list));
			if (!added.length) {
				setNotice("Those files weren't photos.");
				return;
			}
			setItems([...sample ? [] : items, ...added], false);
			const where = addingToReal ? "Added" : "Loaded";
			setNotice(barcodeScannerAvailable() ? `${where} ${added.length} photo${added.length === 1 ? "" : "s"}.` : `${where} ${added.length} photo${added.length === 1 ? "" : "s"}. Type any barcodes this browser couldn't read.`);
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
	const pct = progress ? Math.round(progress.done / Math.max(progress.total, 1) * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-20 border-b border-line bg-bg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl leading-none",
						children: "Lotcut"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "One video. Every listing."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Likely lot"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-2xl tabular-nums leading-none",
							children: money(items.length ? totals.likely : null)
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1 bg-primary" })]
			}),
			notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-auto w-full max-w-6xl px-4 pt-4 text-sm text-muted lg:px-6",
				role: "status",
				children: notice
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto grid w-full max-w-6xl px-4 pb-16 lg:grid-cols-3 lg:gap-6 lg:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: `flex flex-col gap-5 py-5 lg:col-span-2 ${selected ? "max-lg:hidden" : ""}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-4 rounded-lg border border-line bg-surface p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-3xl",
									children: "Film the pile once."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 max-w-xl text-muted",
									children: "Toys, coins, or a mixed bin. Lotcut cuts the pauses into items, reads barcodes it can see, and drafts a price, a shelf, and a listing you can paste."
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "primary",
											onClick: () => videoInput.current?.click(),
											disabled: busy,
											children: "Upload video"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											onClick: () => cameraInput.current?.click(),
											disabled: busy,
											children: "Use camera"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											onClick: () => photoInput.current?.click(),
											disabled: busy,
											children: "Add photos"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "quiet",
											onClick: onSample,
											disabled: busy,
											children: "Sample bin"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: videoInput,
									className: "sr-only",
									type: "file",
									accept: "video/mp4,video/webm,video/quicktime,video/*",
									onChange: (event) => {
										takeVideo(event.target.files?.[0]);
										event.target.value = "";
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: cameraInput,
									className: "sr-only",
									type: "file",
									accept: "video/*",
									capture: "environment",
									onChange: (event) => {
										takeVideo(event.target.files?.[0]);
										event.target.value = "";
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: photoInput,
									className: "sr-only",
									type: "file",
									accept: "image/*",
									multiple: true,
									onChange: (event) => void onPhotos(event.target.files)
								}),
								videoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
											ref: videoRef,
											src: videoUrl,
											controls: true,
											playsInline: true,
											muted: true,
											preload: "auto",
											className: "w-full rounded-md bg-ink"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-muted",
											children: fileLabel
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "primary",
												onClick: () => void onCut(),
												disabled: busy,
												children: busy ? "Cutting…" : "Cut into items"
											}), busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												onClick: () => abortRef.current?.abort(),
												children: "Cancel"
											}) : null]
										})
									]
								}) : null,
								progress ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-2 overflow-hidden rounded-full bg-raised",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-full bg-primary",
										style: { width: `${pct}%` }
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm text-muted",
									children: progress.label
								})] }) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
									className: "text-sm",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
											className: "min-h-11 py-2 text-muted",
											children: "How to film, and cut settings"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
											className: "mt-2 flex list-decimal flex-col gap-2 pl-5 text-muted",
											children: STEPS.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: step }, step))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-4 grid gap-4",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "grid gap-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "flex justify-between",
														children: ["Cut sensitivity", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "tabular-nums text-fg",
															children: sensitivity
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "range",
														min: 1,
														max: 100,
														value: sensitivity,
														onChange: (event) => setSensitivity(Number(event.target.value)),
														className: "accent-primary"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-muted",
														children: "Higher splits more often. Lower if one toy becomes three items."
													})
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "grid gap-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "flex justify-between",
														children: ["Combine pauses closer than", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "tabular-nums text-fg",
															children: groupWindow === 0 ? "Off" : `${groupWindow}s`
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "range",
														min: 0,
														max: 8,
														step: .5,
														value: groupWindow,
														onChange: (event) => setGroupWindow(Number(event.target.value)),
														className: "accent-primary"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-muted",
														children: "Turn this up when you pause twice on the same piece — front, then barcode. Leave it off when each pause is a different item."
													})
												]
											})]
										})
									]
								})
							]
						}),
						sample ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-md border border-line px-3 py-2 text-sm text-muted",
							children: "Sample bin, not your footage. The prices are examples so you can see a finished lot. Upload a video or photos to replace it."
						}) : null,
						items.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
										label: "Items",
										value: String(items.length)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
										label: "Barcodes",
										value: String(codes)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
										label: "Check by hand",
										value: String(checks)
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									"About ",
									money(totals.net),
									" after the recommended fees, before shipping, on",
									" ",
									totals.priced,
									" priced item",
									totals.priced === 1 ? "" : "s",
									"."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "primary",
										disabled: writing || busy,
										onClick: () => void onWriteAll(),
										children: writing ? "Writing…" : "Write listings"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										onClick: () => downloadText("lotcut.csv", lotCsv(items), "text/csv"),
										children: "Export CSV"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										onClick: () => void copyBrief(),
										children: "Copy brief"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "film-edge flex gap-2 overflow-x-auto rounded-md p-3",
								children: items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => select(item.id),
									className: "w-20 shrink-0 text-left",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: item.shots[0]?.src,
										alt: "",
										className: `aspect-square w-full rounded-sm object-cover ${item.id === selectedId ? "outline outline-2 outline-offset-2 outline-primary" : ""}`
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-xs text-muted tabular-nums",
										children: index + 1
									})]
								}, item.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex flex-col gap-2",
								children: items.map((item) => {
									const active = item.id === selectedId;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => select(item.id),
										className: `flex w-full gap-3 rounded-lg border bg-surface p-3 text-left ${active ? "border-primary" : "border-line"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: item.shots[0]?.src,
											alt: "",
											className: "h-20 w-20 shrink-0 rounded-sm object-cover"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0 flex-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "line-clamp-2 font-display text-lg leading-tight",
													children: itemTitle(item)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "mt-1 block text-sm text-muted",
													children: [
														item.barcode || "No barcode",
														item.research ? ` · ${item.research.category}` : "",
														item.status === "researching" ? " · writing" : "",
														item.status === "error" ? " · needs a retry" : ""
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "mt-2 flex flex-wrap items-center gap-2",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "rounded-sm bg-primary px-2 py-1 text-sm font-medium text-ink tabular-nums",
															children: money(itemPrice(item))
														}),
														needsHandCheck(item) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-sm text-muted",
															children: "Check by hand"
														}) : null,
														item.shots.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-sm text-muted",
															children: [item.shots.length, " frames"]
														}) : null
													]
												})
											]
										})]
									}) }, item.id);
								})
							})
						] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "flex flex-col gap-3 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-xl",
									children: "What actually moves the price"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted",
									children: "Barcoded and sealed can belong on Amazon if the item actually sells there. Opened, damaged, or incomplete belongs on eBay, with the flaw in the first bullet. Coins are never a stock description: year, mint mark, wear, and the words raw and ungraded."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted",
									children: "Titles that rank are specifics — brand, year, model, barcode — not adjectives. If a card is flagged, take it out of the batch. One wrong variant costs more than the rest of the lot."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted",
									children: "Sold comps are one tap away on each item. Lotcut does not pretend to have scraped eBay’s completed sales. Price from those searches, then use the fee table to see what you keep."
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: `${selected ? "max-lg:fixed max-lg:inset-0 max-lg:z-30 max-lg:overflow-y-auto max-lg:bg-bg max-lg:px-4" : "hidden lg:block"} lg:col-span-1`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "detail-scroll lg:sticky lg:top-20",
						children: selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemDetail, {
							item: selected,
							onClose: () => select(null)
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden py-8 lg:block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-2xl",
								children: "The lot ticket"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Cut a video or open the sample bin. Each item gets a price band, a shelf, a fee net, and a listing you can paste into eBay."
							})]
						})
					})
				})]
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-line bg-surface px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-2xl tabular-nums",
			children: value
		})]
	});
}
var SplitComponent = Studio;
//#endregion
export { SplitComponent as component };
