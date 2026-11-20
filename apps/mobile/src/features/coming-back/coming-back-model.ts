import type { api } from "@xolace/backend/convex/_generated/api";
import {
	isStreakMilestone,
	streakMilestoneCopy,
} from "@xolace/backend/convex/streaks/milestones";
import type { Id } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import { getStreakCopy } from "@/lib/streak-copy";
import {
	type Answer,
	AWAY,
	type Away,
	CHECK_IN,
	type CheckInPick,
	type CheckInTier,
	WELCOME_BACK,
} from "./copy";

export type WaitingCard = NonNullable<
	FunctionReturnType<typeof api.followUps.waiting.getWaitingCard>
>;
export type MonthEvent = NonNullable<
	FunctionReturnType<typeof api.monthlyEvents.prompt.getWaiting>
>;

export type Row = "ck" | "pm";
export type RowId = "fz" | Row;
export type PromptState = "waiting" | "read" | "passed" | "written";
export type GreetMode = "greet" | "left";

export type Items = {
	freeze: { days: number; streak: number } | null;
	card: WaitingCard | null;
	event: MonthEvent | null;
	day: string;
};

export const NO_ITEMS: Items = {
	card: null,
	day: "",
	event: null,
	freeze: null,
};

export type Outcomes = {
	answer: Answer | null;
	ckDone: boolean;
	prompt: PromptState;
};

export const NO_OUTCOMES: Outcomes = {
	answer: null,
	ckDone: false,
	prompt: "waiting",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const AWAY_AFTER_DAYS = 2;
const AWAY_TIERS = [
	{ days: 90, tier: "away-90-plus" },
	{ days: 30, tier: "away-30-90" },
	{ days: 14, tier: "away-14-30" },
] as const;
const ANNIVERSARY = { from: 360, to: 380 } as const;
const WEEK = 7;

const startOfDay = (t: number) => {
	const d = new Date(t);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

function localDaysBetween(from: number, to: number): number {
	return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

type Profile = { lastSessionAt?: number; firstSessionAt?: number };

export function awayOf(profile: Profile, now: number): Away {
	const last = profile.lastSessionAt;
	if (last === undefined || localDaysBetween(last, now) < AWAY_AFTER_DAYS) {
		return "next";
	}
	if (profile.firstSessionAt !== undefined) {
		const since = Math.floor((now - profile.firstSessionAt) / DAY_MS);
		if (since >= ANNIVERSARY.from && since <= ANNIVERSARY.to) {
			return "anniversary";
		}
	}
	const gap = Math.floor((now - last) / DAY_MS);
	return AWAY_TIERS.find((t) => gap >= t.days)?.tier ?? "recent";
}

const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;
const MONTHS = [
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
] as const;

export function dayLabel(at: number, now: number): string {
	const days = localDaysBetween(at, now);
	if (days <= 0) {
		return WELCOME_BACK.today;
	}
	if (days === 1) {
		return WELCOME_BACK.yesterday;
	}
	const d = new Date(at);
	if (days < WEEK) {
		return WEEKDAYS[d.getDay()] ?? "";
	}
	return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function episodeKey(
	away: Away,
	lastSessionAt: number | undefined,
	waiting: { card: WaitingCard | null; event: MonthEvent | null }
): string {
	if (away !== "next") {
		return `away:${lastSessionAt ?? 0}`;
	}
	return `next:${waiting.card?._id ?? ""}:${waiting.event?._id ?? ""}`;
}

export function shouldGreet(away: Away, items: Items): boolean {
	if (away !== "next") {
		return true;
	}
	return items.card !== null || items.event !== null || items.freeze !== null;
}

export function waitingOf(items: Items, o: Outcomes) {
	return {
		ck: items.card !== null && o.answer === null,
		pm: items.event !== null && o.prompt === "waiting",
	};
}

export function rowsOf(items: Items, mode: GreetMode): RowId[] {
	const ck = items.card !== null;
	const acute = items.card?.tier === "acute";
	const rows: RowId[] = [];
	if (ck && acute) {
		rows.push("ck");
	}
	if (items.freeze && mode === "greet") {
		rows.push("fz");
	}
	if (ck && !acute) {
		rows.push("ck");
	}
	if (items.event) {
		rows.push("pm");
	}
	return rows;
}

export function copyOf(
	away: Away,
	mode: GreetMode,
	items: Items,
	o: Outcomes,
	name: string | null
) {
	const w = waitingOf(items, o);
	if (mode === "left") {
		const s = WELCOME_BACK.stillHere;
		return {
			body: s.body,
			cta: w.ck || w.pm ? s.waiting : s.done,
			title: s.title,
		};
	}
	if (away === "next") {
		const n = WELCOME_BACK.next;
		const two = items.card !== null && items.event !== null;
		const body = two ? n.two : n.one(items.card ? items.day : null);
		return { body, cta: n.cta, title: n.title(name) };
	}
	return AWAY[away];
}

export function pillLabelOf(
	w: { ck: boolean; pm: boolean },
	day: string
): string | null {
	const p = WELCOME_BACK.pill;
	if (w.ck && w.pm) {
		return p.both;
	}
	if (w.ck) {
		return p.checkIn(day);
	}
	return w.pm ? p.prompt : null;
}

export function picksFor(tier: CheckInTier): readonly CheckInPick[] {
	return tier === "acute"
		? ["still_here", "lighter"]
		: ["lighter", "still_here", "heavier", "processed"];
}

export function isCareful(
	card: Pick<WaitingCard, "tier" | "escalationDerived">
) {
	return card.tier === "acute" || card.escalationDerived;
}

export function questionOf(card: Pick<WaitingCard, "cardText"> | null): string {
	const text = card?.cardText.trim();
	return text ? text : CHECK_IN.fallbackQuestion;
}

export function checkInRow(day: string, o: Outcomes) {
	const c = WELCOME_BACK.checkIn;
	const title = c.title(day);
	if (o.ckDone && o.answer) {
		return {
			done: true,
			label: c.doneA11y(day, o.answer),
			sub: c.done(o.answer),
			title,
		};
	}
	return { done: false, label: `${title}. ${c.sub}`, sub: c.sub, title };
}

export function promptRow(state: PromptState) {
	const c = WELCOME_BACK.prompt;
	if (state === "passed") {
		return {
			done: true,
			label: c.passedA11y,
			sub: c.passed,
			title: c.doneTitle,
		};
	}
	if (state === "waiting") {
		return {
			done: false,
			label: `${c.title}. ${c.sub}`,
			sub: c.sub,
			title: c.title,
		};
	}
	return { done: true, label: c.readA11y, sub: c.read, title: c.doneTitle };
}

export type CheckInParams = {
	cardId?: string;
	cardText?: string;
	createdAt?: string;
	escalation?: string;
	tier?: CheckInTier;
};

const TIERS: readonly string[] = ["acute", "elevated", "standard"];

export function cardFromParams(p: CheckInParams): WaitingCard | null {
	if (!(p.cardId && p.tier && TIERS.includes(p.tier))) {
		return null;
	}
	return {
		_id: p.cardId as Id<"follow_up_cards">,
		cardText: p.cardText ?? "",
		createdAt: Number(p.createdAt) || 0,
		escalationDerived: p.escalation === "1",
		shown: true,
		tier: p.tier,
	};
}

export function nodOf(streak: number): string | null {
	if (streak <= 0) {
		return null;
	}
	if (isStreakMilestone(streak)) {
		return streakMilestoneCopy(streak);
	}
	return getStreakCopy(streak) ?? `${streak} days of coming back. It counts.`;
}
