import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import type { DayPhase } from "@/lib/day-phase";
import type { ProfileSummary } from "@/lib/profile-summary";
import { COPY } from "./copy";
import { type KindlingEmptyMode, kindlingCardMode } from "./kindling/card-mode";
import type { KindlingView } from "./kindling/kindling-model";
import type { RailTile } from "./rail/rail-model";

export type TodayPhase = DayPhase;

export type CardMode =
	| "loading"
	| "idle"
	| "waiting"
	| "ready"
	| "next"
	| "failed";

export function cardMode(state: string | null | undefined): CardMode {
	switch (state) {
		case undefined:
			return "loading";
		case "input_received":
		case "processing":
			return "waiting";
		case "mirror_delivered":
			return "ready";
		case "confirmed":
			return "next";
		case "error":
			return "failed";
		default:
			return "idle";
	}
}

export function cardFace(mode: CardMode) {
	return mode === "idle" || mode === "loading" ? null : COPY.card[mode];
}

export function cardA11yHint(mode: CardMode, doorsHint: string): string {
	const face = cardFace(mode);
	if (face) {
		return `${COPY.opensReflect}. ${face.body}`;
	}
	return mode === "idle" ? doorsHint : COPY.opensReflect;
}

export function headerCopy(
	phase: TodayPhase,
	weekday: string,
	name: string | null | undefined
): { eyebrow: string; greeting: string } {
	const trimmed = name?.trim();
	return {
		eyebrow: `${weekday} · ${COPY.partOfDay[phase]}`,
		greeting: COPY.greeting[phase](trimmed ? trimmed : null),
	};
}

export type Door = "talk" | "vent" | "sit";

export function monthPromptOnCard(
	carried: { prompt: string; carryUntil: number } | null | undefined,
	now: number
): string | null {
	if (!carried || carried.carryUntil <= now) {
		return null;
	}
	const prompt = carried.prompt.trim();
	return prompt ? prompt : null;
}

export type TodayFold = {
	phase: TodayPhase;
	summary: Pick<ProfileSummary, "displayName" | "currentStreak"> | undefined;
	session:
		| Pick<
				NonNullable<FunctionReturnType<typeof api.sessions.getActive>>,
				"state"
		  >
		| null
		| undefined;
	kindling: KindlingView | null | undefined;
	kindlingEmpty: KindlingEmptyMode | undefined;
	campfireSettled: boolean;
	rail: RailTile[] | undefined;
};

export function todayReady(fold: TodayFold): boolean {
	if (fold.summary === undefined || fold.session === undefined) {
		return false;
	}
	if (fold.phase === "late") {
		return fold.rail !== undefined;
	}
	return (
		kindlingCardMode(fold.kindling, fold.kindlingEmpty) !== undefined &&
		fold.campfireSettled
	);
}

export const TODAY_HOLD_MS = 2500;

export function todayHolds(hold: {
	ready: boolean;
	offline: boolean;
	waitedMs: number;
}): boolean {
	return !(hold.ready || hold.offline) && hold.waitedMs < TODAY_HOLD_MS;
}

export function campfireSettled(
	cohortStatus: string | undefined,
	v2Intake: boolean | undefined,
	statsSettled: boolean
): boolean {
	if (cohortStatus === undefined) {
		return false;
	}
	if (cohortStatus !== "hidden") {
		return true;
	}
	return v2Intake !== undefined && (!v2Intake || statsSettled);
}

export const introDue = (playedDay: string | null, today: string): boolean =>
	playedDay !== today;

export type SeenStreak = {
	count: number;
	ignitedDay: string | null;
};

export function streakStep(
	seen: SeenStreak | null,
	count: number,
	today: string
): { ignite: boolean; next: SeenStreak } {
	if (!seen) {
		return { ignite: false, next: { count, ignitedDay: null } };
	}
	const ignite = count > seen.count && seen.ignitedDay !== today;
	return {
		ignite,
		next: { count, ignitedDay: ignite ? today : seen.ignitedDay },
	};
}

export type StreakShown = { count: number; day: string; igniteKey: number };

export function nextStreakShown(
	shown: StreakShown | null,
	count: number | undefined,
	day: string,
	seen: () => SeenStreak | null
): { shown: StreakShown; keep: SeenStreak } | null {
	if (count === undefined || (shown?.count === count && shown.day === day)) {
		return null;
	}
	const { ignite, next } = streakStep(seen(), count, day);
	return {
		keep: next,
		shown: {
			count,
			day,
			igniteKey: (shown?.igniteKey ?? 0) + (ignite ? 1 : 0),
		},
	};
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null;

const parse = (raw: string | null): unknown => {
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

export function parseSeenStreak(
	raw: string | null,
	userId: string
): SeenStreak | null {
	const v = parse(raw);
	if (
		!isRecord(v) ||
		v.userId !== userId ||
		typeof v.count !== "number" ||
		!(v.ignitedDay === null || typeof v.ignitedDay === "string")
	) {
		return null;
	}
	return { count: v.count, ignitedDay: v.ignitedDay };
}

export function parseIntroDay(
	raw: string | null,
	userId: string
): string | null {
	const v = parse(raw);
	return isRecord(v) && v.userId === userId && typeof v.day === "string"
		? v.day
		: null;
}

export function localDay(now: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
