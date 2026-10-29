import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

export type Icon = Exclude<ComponentProps<typeof SymbolView>["name"], string>;
type FreeView = FunctionReturnType<typeof api.compounding.insights.freeView>;
type PlusView = NonNullable<
	FunctionReturnType<typeof api.compounding.insights.plusView>
>;
/** Free or Xolace+: the Xolace+ fields are simply absent from the free view, the upsell from
 * Xolace+'s. */
export type InsightsView = Omit<FreeView, "upsell"> &
	Partial<Pick<FreeView, "upsell">> &
	Partial<Pick<PlusView, "overallTrend" | "overallTrendSince" | "insights">>;
export type Insight = PlusView["insights"][number];
export type DomainItem = FreeView["domains"][number] &
	Partial<
		Pick<
			PlusView["domains"][number],
			| "steadiness"
			| "baseline"
			| "trend"
			| "trendSince"
			| "compounding"
			| "kindling"
		>
	>;

export const icon = (ios: string, android: string) =>
	({ android, ios, web: android }) as Icon;
export const GAUGE = icon("gauge.with.needle", "speed");

export const DOMAIN_META: Record<
	DomainItem["domain"],
	{ label: string; icon: Icon }
> = {
	belonging: { icon: icon("person.3.fill", "groups"), label: "Belonging" },
	family: {
		icon: icon("figure.2.and.child.holdinghands", "family_restroom"),
		label: "Family",
	},
	health: { icon: icon("bed.double.fill", "bedtime"), label: "Health & Rest" },
	love: { icon: icon("heart.fill", "favorite"), label: "Love & Friendship" },
	money: { icon: icon("house.fill", "home"), label: "Money & Home" },
	purpose: {
		icon: icon("sparkles", "auto_awesome"),
		label: "Purpose & Future",
	},
	self: { icon: icon("person.fill", "person"), label: "Self" },
	work: { icon: icon("briefcase.fill", "work"), label: "Work & Studies" },
};

/** The free view's word for a domain's state: how well Xolace knows it, never a grade. */
export const STAGE_WORD: Record<DomainItem["state"], string> = {
	settled: "Known well",
	unlocked: "Getting to know it",
	warming: "Warming up",
};

/** Xolace+ only (#520): what Xolace saw, in the free upsell's words, never a grade. */
export const COMPOUNDING_WORD = {
	compounding: "Heavier than your usual",
	easing: "Easing",
} as const;
/** The grid cell's narrower line. */
export const COMPOUNDING_SHORT = {
	compounding: "Heavier lately",
	easing: "Easing",
} as const;

/** Colour is state, never domain (#491): quiet is muted, compounding and easing ember (amber,
 * never red). */
export type Tone = "accent" | "ember" | "muted";
export const toneOf = (d: DomainItem): Tone =>
	d.lastSeenAt === null ? (d.compounding ? "ember" : "accent") : "muted";

/** The sub-line under a domain's name in rows and the detail card. */
export const subOf = (d: DomainItem) =>
	d.lastSeenAt === null
		? d.compounding
			? COMPOUNDING_WORD[d.compounding]
			: STAGE_WORD[d.state]
		: `Not recently · last seen ${lastSeen(d.lastSeenAt)}`;

export const lastSeen = (at: number) =>
	new Date(at).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	});

/** What a trend is measured against: last week, or a quiet domain's last reading ("since
 * April"). */
export const trendBasis = (since?: number | null) => {
	if (since == null) {
		return "last week";
	}
	const d = new Date(since);
	const year =
		d.getFullYear() === new Date().getFullYear() ? undefined : "numeric";
	return d.toLocaleDateString(undefined, { month: "long", year });
};

export const CAVEAT =
	"This is what Xolace knows from how you've used Xolace. It may not reflect your whole life.";
