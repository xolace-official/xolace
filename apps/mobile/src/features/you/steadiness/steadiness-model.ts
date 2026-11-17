/**
 * The Steadiness screen (steadiness.md): `compounding.insights`' free or Xolace+ view in, the
 * dial, each part of life and the free doors out. Pure. Colour is state, never the part:
 * accent, ember (amber) for heavier lately and easing, muted for quiet. Never red.
 */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/you/copy";

type FreeView = FunctionReturnType<typeof api.compounding.insights.freeView>;
type PlusView = NonNullable<
	FunctionReturnType<typeof api.compounding.insights.plusView>
>;
type PlusDomain = PlusView["domains"][number];
export type Insight = PlusView["insights"][number];
export type Upsell = NonNullable<FreeView["upsell"]>;
export type Domain = FreeView["domains"][number]["domain"];
export type DomainItem = FreeView["domains"][number] &
	Partial<
		Pick<
			PlusDomain,
			| "baseline"
			| "compounding"
			| "kindling"
			| "steadiness"
			| "trend"
			| "trendSince"
		>
	>;
/** Either view: Xolace+'s fields are absent from the free one, the upsell from Xolace+'s. */
export type StView = {
	domains: DomainItem[];
	overall: number | null;
	overallTrend?: number | null;
	overallTrendSince?: number | null;
	insights?: Insight[];
	upsell?: Upsell | null;
};

export type Tone = "accent" | "ember" | "muted";
export type Noticed = { eyebrow: string; text: string; date: string };
export type Trend = { delta: number; since: number | null };

export type PartView = {
	domain: Domain;
	name: string;
	warming: boolean;
	tone: Tone;
	/** Xolace+ with a reading: the number, your usual and the change. Null otherwise. */
	value: number | null;
	usual: number | null;
	trend: Trend | null;
	/** The line under the name in the list and the detail card. */
	sub: string;
	/** The ring's word when it shows no number. */
	word: string;
	/** The grid's small line under the name: "last seen 18 Sep", "Heavier lately". */
	gridSub: string | null;
	/** Ember sub-lines (heavier lately, easing). */
	emberSub: boolean;
	label: string;
	/** Free only: the locked detail's line. */
	peek: string;
	kindling: boolean;
	noticed: Noticed[];
};

export type DialView =
	| {
			lit: true;
			score: number;
			/** Xolace+ only; free users get the locked chip. */
			trend: Trend | null;
			label: string;
			noticed: Noticed[];
	  }
	| { lit: false; known: number; label: string };

/** Production's TickGauge: 56 ticks, lit up to the score. */
export const DIAL_TICKS = 56;
/** Steadiness lights at this many known parts (the server's rule). */
const PARTS_TO_LIGHT = 2;

/** Three letters, as the board ("18 Sep"; ICU's en-GB now writes "Sept"). */
const SHORT_MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long" });
const S = COPY.steadinessScreen;
const STAGE = COPY.steadiness.stage;
const LATELY = COPY.steadiness.lately;

/** "18 Sep". */
function shortDay(at: number): string {
	const d = new Date(at);
	return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

/** What a change is measured against: last week, or a quiet part's last reading ("April"). */
function trendBasis(since: number | null, now: Date): string {
	if (since === null) {
		return COPY.steadiness.trendBasis;
	}
	const d = new Date(since);
	return d.getFullYear() === now.getFullYear()
		? MONTH.format(d)
		: `${MONTH.format(d)} ${d.getFullYear()}`;
}

/** The chip: "+4 vs last week", "−6 since April", "same as last week"; `short` for the list. */
export function trendText(t: Trend, now: Date, short = false): string {
	const vs =
		t.since === null ? " vs last week" : ` since ${trendBasis(t.since, now)}`;
	if (t.delta === 0) {
		return short
			? "same"
			: `same${t.since === null ? " as" : " since"} ${trendBasis(t.since, now)}`;
	}
	const n = `${t.delta > 0 ? "+" : "−"}${Math.abs(t.delta)}`;
	return short ? n : `${n}${vs}`;
}

/** Read aloud: "up 4 since last week", "same as last week". */
export function trendSay(t: Trend, now: Date): string {
	const basis = trendBasis(t.since, now);
	if (t.delta === 0) {
		return `same ${t.since === null ? "as" : "since"} ${basis}`;
	}
	return `${t.delta > 0 ? "up" : "down"} ${Math.abs(t.delta)} since ${basis}`;
}

/** Ticks lit for a score, of `n`. */
export const litTicks = (score: number, n = DIAL_TICKS) =>
	Math.max(0, Math.min(n, Math.floor((score / 100) * n + 1e-9)));

function noticedFor(
	insights: Insight[] | undefined,
	domain: Domain | null
): Noticed[] {
	return (insights ?? [])
		.filter((i) =>
			domain === null
				? i.level === "overall"
				: i.level === "domain" && i.domains.includes(domain)
		)
		.map((i) => ({
			date: S.noticed(shortDay(i.writtenAt)),
			eyebrow: S.eyebrow[i.kind],
			text: i.text,
		}));
}

function partOf(
	d: DomainItem,
	view: StView,
	isPlus: boolean,
	now: Date
): PartView {
	const name = COPY.steadiness.domains[d.domain];
	const warming = d.state === "warming";
	const quiet = d.lastSeenAt !== null;
	// Free users learn only of the upsell's part, and only that it's been heavier.
	const lately = isPlus
		? (d.compounding ?? null)
		: view.upsell?.domain === d.domain
			? "compounding"
			: null;
	const tone: Tone = quiet ? "muted" : lately ? "ember" : "accent";
	const sub =
		d.lastSeenAt === null
			? lately
				? LATELY[lately]
				: STAGE[d.state]
			: S.quietSince(shortDay(d.lastSeenAt));
	const value = isPlus ? (d.steadiness ?? null) : null;
	const usual = value === null ? null : (d.baseline ?? null);
	const trend =
		value !== null && d.trend != null
			? { delta: d.trend, since: d.trendSince ?? null }
			: null;
	const said = warming ? S.warming : sub.charAt(0).toLowerCase() + sub.slice(1);
	const label =
		value === null
			? `${name}, ${said}`
			: `${name}, ${said}, ${value} out of 100${usual === null ? "" : `, ${S.usually(usual)}`}${trend ? `, ${trendSay(trend, now)}` : ""}`;
	return {
		domain: d.domain,
		emberSub: !quiet && lately !== null,
		gridSub:
			d.lastSeenAt === null
				? !isPlus || lately === null
					? null
					: lately === "compounding"
						? S.heavier
						: LATELY.easing
				: S.seen(shortDay(d.lastSeenAt)),
		kindling: isPlus && d.kindling === true,
		label,
		name,
		noticed: isPlus ? noticedFor(view.insights, d.domain) : [],
		peek: S.peek(name, lately !== null),
		sub,
		tone,
		trend,
		usual,
		value,
		warming,
		word: warming ? S.warming : quiet ? COPY.steadiness.quiet : sub,
	};
}

/** The dial: lit with the score (and, for Xolace+, the change and what Xolace noticed), or
 * waiting with how many parts it knows so far. */
export function dialOf(view: StView, isPlus: boolean, now: Date): DialView {
	if (view.overall === null) {
		const known = view.domains.filter((d) => d.state !== "warming").length;
		return {
			known: Math.min(known, PARTS_TO_LIGHT - 1),
			label: S.notLit,
			lit: false,
		};
	}
	const trend =
		isPlus && view.overallTrend != null
			? { delta: view.overallTrend, since: view.overallTrendSince ?? null }
			: null;
	return {
		label: S.dialLabel(view.overall, trend ? trendSay(trend, now) : null),
		lit: true,
		noticed: isPlus ? noticedFor(view.insights, null) : [],
		score: view.overall,
		trend,
	};
}

export const partsOf = (view: StView, isPlus: boolean, now: Date) =>
	view.domains.map((d) => partOf(d, view, isPlus, now));

/** The part in the grid's detail card: the one picked, else the first with a number. */
export function selectedPart(
	parts: readonly PartView[],
	picked: Domain | null
): PartView | null {
	const scored = parts.filter((p) => p.value !== null);
	return scored.find((p) => p.domain === picked) ?? scored[0] ?? null;
}

/** What a tap on a part does. */
export type PartTap = "none" | "select" | "toggle-open" | "toggle-peek";
export function tapOf(
	part: PartView,
	isPlus: boolean,
	view: "grid" | "list"
): PartTap {
	if (part.warming) {
		return "none";
	}
	if (!isPlus) {
		// The list keeps production's rows; only the heavier part opens its locked card there.
		return view === "grid" || part.emberSub ? "toggle-peek" : "none";
	}
	if (part.value === null) {
		return "none";
	}
	return view === "list" ? "toggle-open" : "select";
}
