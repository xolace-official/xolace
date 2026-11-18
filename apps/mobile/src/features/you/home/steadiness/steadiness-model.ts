/**
 * The Steadiness card (you.md §4) from `compounding.insights` (the free view, or Xolace+'s with
 * numbers and the trend). Pure. There's no word for the score: the owner removed it.
 */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/you/copy";

type FreeView = FunctionReturnType<typeof api.compounding.insights.freeView>;
type PlusView = NonNullable<
	FunctionReturnType<typeof api.compounding.insights.plusView>
>;
/** Either view: Xolace+'s fields are absent from the free one. */
export type InsightsView = Pick<FreeView, "overall"> & {
	domains: (FreeView["domains"][number] &
		Partial<Pick<PlusView["domains"][number], "compounding">>)[];
	overallTrend?: PlusView["overallTrend"];
	overallTrendSince?: PlusView["overallTrendSince"];
};
export type Domain = FreeView["domains"][number]["domain"];

/** The card shows this many parts, live ones first (the server's order). */
const PARTS_SHOWN = 3;
/** Steadiness lights at this many known parts (the server's rule). */
const PARTS_TO_LIGHT = 2;

export type PartTone = "accent" | "ember" | "muted";
export type Part = {
	domain: Domain;
	name: string;
	word: string;
	tone: PartTone;
};

export type Trend =
	| { kind: "shown"; text: string }
	/** Free: "Trend with Xolace+", muted, with a lock. */
	| { kind: "locked" }
	| null;

export type SteadinessCard =
	| { lit: true; score: number; trend: Trend; parts: Part[] }
	| { lit: false; known: number; parts: Part[] };

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long" });

/** What the trend is measured against: last week, or a quiet part's last reading. */
function basis(since: number | null | undefined, now: Date): string {
	if (since == null) {
		return COPY.steadiness.trendBasis;
	}
	const d = new Date(since);
	const month = MONTH.format(d);
	return d.getFullYear() === now.getFullYear()
		? month
		: `${month} ${d.getFullYear()}`;
}

function partOf(d: InsightsView["domains"][number], isPlus: boolean): Part {
	const name = COPY.steadiness.domains[d.domain];
	if (d.lastSeenAt !== null) {
		return {
			domain: d.domain,
			name,
			tone: "muted",
			word: COPY.steadiness.quiet,
		};
	}
	if (isPlus && d.compounding) {
		return {
			domain: d.domain,
			name,
			tone: "ember",
			word: COPY.steadiness.lately[d.compounding],
		};
	}
	return {
		domain: d.domain,
		name,
		tone: "accent",
		word: COPY.steadiness.stage[d.state],
	};
}

export function steadinessCard(
	view: InsightsView,
	isPlus: boolean,
	now: Date
): SteadinessCard {
	const parts = view.domains
		.slice(0, PARTS_SHOWN)
		.map((d) => partOf(d, isPlus));
	if (view.overall === null) {
		// As the server counts toward lighting (`compounding/steadiness.ts`): every part past
		// warming, quiet ones too.
		const known = view.domains.filter((d) => d.state !== "warming").length;
		return { known: Math.min(known, PARTS_TO_LIGHT - 1), lit: false, parts };
	}
	let trend: Trend = { kind: "locked" };
	if (isPlus) {
		trend =
			view.overallTrend == null
				? null
				: {
						kind: "shown",
						text: COPY.steadiness.trend(
							Math.round(view.overallTrend),
							basis(view.overallTrendSince, now)
						),
					};
	}
	return { lit: true, parts, score: view.overall, trend };
}

/** The ticks lit for a score: 31 across the fan, the first lit from 1. */
export const TICKS = 31;
export function litTicks(score: number): number {
	return Math.round((Math.max(0, Math.min(100, score)) / 100) * TICKS);
}
