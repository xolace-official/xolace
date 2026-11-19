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

/** `followUps.waiting.getWaitingCard`: the check-in that's waiting (ready or shown, under 3 days). */
export type WaitingCard = NonNullable<
	FunctionReturnType<typeof api.followUps.waiting.getWaitingCard>
>;
/** `monthlyEvents.prompt.getWaiting`: this month's event, not yet read, passed or written. */
export type MonthEvent = NonNullable<
	FunctionReturnType<typeof api.monthlyEvents.prompt.getWaiting>
>;

export type Row = "ck" | "pm";
export type RowId = "fz" | Row;
export type PromptState = "waiting" | "read" | "passed" | "written";
export type GreetMode = "greet" | "left";

/**
 * What one opening of the greeting lists, pinned when it opens (handoff §1): rows never
 * reorder or disappear while the card is open, though the server drops a card once it's
 * answered and an event once it's chosen.
 */
export type Items = {
	/** Freeze-bridged days not yet acknowledged, and the streak they held (null: none). */
	freeze: { days: number; streak: number } | null;
	card: WaitingCard | null;
	event: MonthEvent | null;
	/** The check-in's day, as its row and the pill say it ("Tuesday", "yesterday"). */
	day: string;
};

export const NO_ITEMS: Items = {
	card: null,
	day: "",
	event: null,
	freeze: null,
};

/** Where each item stands in this opening. */
export type Outcomes = {
	/** The check-in's answer, saved at the tap; null while it waits. */
	answer: Answer | null;
	/** The row has ticked (after the check-in has gone). */
	ckDone: boolean;
	prompt: PromptState;
};

export const NO_OUTCOMES: Outcomes = {
	answer: null,
	ckDone: false,
	prompt: "waiting",
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** A gap of two local days or more (a whole day missed) is away. */
const AWAY_AFTER_DAYS = 2;
const AWAY_TIERS = [
	{ days: 90, tier: "away-90-plus" },
	{ days: 30, tier: "away-30-90" },
	{ days: 14, tier: "away-14-30" },
] as const;
/** Production's anniversary window, days after the first session. */
const ANNIVERSARY = { from: 360, to: 380 } as const;
const WEEK = 7;

const startOfDay = (t: number) => {
	const d = new Date(t);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

/** Whole local days from `from` to `to` (0 the same day). */
function localDaysBetween(from: number, to: number): number {
	return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

type Profile = { lastSessionAt?: number; firstSessionAt?: number };

/**
 * How long someone was away (production's `computeQuietReturn` tiers, plus `recent` for a few
 * days and `next` for the next day). The anniversary wins only when they were away.
 */
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

/** A day as the row says it: "today", "yesterday", a weekday this week, else "Nov 12". */
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

/**
 * The episode a greeting belongs to, so it greets once: one per return when away (production's
 * once per `lastSessionAt`), one per set of waiting things on the next day.
 */
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

/**
 * Away tiers always get the greeting; the next day only if something waits (handoff §1) or a
 * freeze held the streak (it used to have its own screen).
 */
export function shouldGreet(away: Away, items: Items): boolean {
	if (away !== "next") {
		return true;
	}
	return items.card !== null || items.event !== null || items.freeze !== null;
}

/** What still waits in an opening: the check-in unanswered, the prompt untouched. */
export function waitingOf(items: Items, o: Outcomes) {
	return {
		ck: items.card !== null && o.answer === null,
		pm: items.event !== null && o.prompt === "waiting",
	};
}

/**
 * The rows in order: freeze, check-in, prompt; an acute check-in goes first. "Still here."
 * drops the freeze (its items hold only what was waiting when it opened).
 */
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

/** The title, body and button: the tier's hello, the next day's, or "Still here.". */
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

/** The pill's words, or null when nothing waits. */
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

/** The answers on the cards, in order (production's `chipsForTier`). */
export function picksFor(tier: CheckInTier): readonly CheckInPick[] {
	return tier === "acute"
		? ["still_here", "lighter"]
		: ["lighter", "still_here", "heavier", "processed"];
}

/** A hard night, or a card from an escalation: no sharing, and the resources link shows. */
export function isCareful(
	card: Pick<WaitingCard, "tier" | "escalationDerived">
) {
	return card.tier === "acute" || card.escalationDerived;
}

/** The check-in's question: the card's own sentence, written server-side. */
export function questionOf(card: Pick<WaitingCard, "cardText"> | null): string {
	const text = card?.cardText.trim();
	return text ? text : CHECK_IN.fallbackQuestion;
}

/** The check-in row's words and VoiceOver label. */
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

/** The prompt row's words and VoiceOver label. */
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

/** Opened on its own (You's Follow-ups tab), the card comes in the route's params. */
export type CheckInParams = {
	cardId?: string;
	cardText?: string;
	escalation?: string;
	tier?: CheckInTier;
};

const TIERS: readonly string[] = ["acute", "elevated", "standard"];

/** The card from the route's params, or null when the greeting opened it. */
export function cardFromParams(p: CheckInParams): WaitingCard | null {
	if (!(p.cardId && p.tier && TIERS.includes(p.tier))) {
		return null;
	}
	return {
		_id: p.cardId as Id<"follow_up_cards">,
		cardText: p.cardText ?? "",
		escalationDerived: p.escalation === "1",
		shown: true,
		tier: p.tier,
	};
}

/** The streak nod on a lighter or worked-through answer: a milestone's line first, then the day's. */
export function nodOf(streak: number): string | null {
	if (streak <= 0) {
		return null;
	}
	if (isStreakMilestone(streak)) {
		return streakMilestoneCopy(streak);
	}
	return getStreakCopy(streak) ?? `${streak} days of coming back. It counts.`;
}
