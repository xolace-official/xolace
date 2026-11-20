import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { convexErrorCode } from "@/lib/convex-error-code";
import { MIN_TALK_S, talkTimeLine, WEEKLY_TALK_S } from "@/lib/talk/talk-time";
import { TALK_CAST } from "@/lib/talk/voice-options";
import { TALK_COPY } from "./copy";
import type { Presence } from "./use-talk";
import type { Turn } from "./use-thread";

export type Phase = "start" | "connecting" | "talk" | "ending";

export type TalkStatus = {
	error?: string | null;
	started: boolean;
	connected: boolean;
	wasLive: boolean;
	presence: Presence;
};

export function phaseOf(talk: TalkStatus, reopened: boolean): Phase {
	const goingIn = reopened && !talk.error;
	if (!(talk.started || talk.connected || talk.wasLive || goingIn)) {
		return "start";
	}
	if (talk.presence === "Ending…") {
		return "ending";
	}
	return talk.connected ? "talk" : "connecting";
}

export type WeekLeft = number | null | undefined;

export const isLow = (week: WeekLeft): boolean =>
	week != null && week < MIN_TALK_S;

export function weekFact(week: WeekLeft): string {
	const { facts } = TALK_COPY.start;
	if (week == null || week >= WEEKLY_TALK_S) {
		return facts.full;
	}
	if (week < MIN_TALK_S) {
		return facts.none;
	}
	return facts.some(Math.floor(week / 60));
}

export const keptTimeLine = (week: WeekLeft): string =>
	(week == null ? null : talkTimeLine(week)) ?? TALK_COPY.kept.full;

export function footnoteLead(week: WeekLeft, micAsk: boolean): string {
	if (isLow(week)) {
		return TALK_COPY.start.footnote.low;
	}
	return micAsk ? TALK_COPY.start.footnote.mic : "";
}

export const clockOf = (seconds: number): string =>
	`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const isLate = (secondsLeft: number | null, fromS: number): boolean =>
	secondsLeft !== null && secondsLeft <= fromS;

export function pillLine(
	presence: Presence,
	secondsLeft: number | null,
	fromS: number
): string {
	return secondsLeft !== null && isLate(secondsLeft, fromS)
		? TALK_COPY.live.clock(presence, clockOf(secondsLeft))
		: presence;
}

export const menuTitle = (minutesLeft: number | null): string =>
	minutesLeft === null
		? TALK_COPY.start.options
		: TALK_COPY.live.menuHead(minutesLeft);

export const heardCount = (turns: readonly Turn[]): number =>
	turns.filter((t) => t.speaker === "person").length;

export const streams = (turn: Turn): boolean =>
	turn.live === true || (turn.speaker === "person" && turn.via === "voice");

export type CastVoice = { id: VoiceSlug; name: string; trait: string };

export const traitOf = (description: string): string =>
	(description.split(". ")[0] ?? description).replace(/\.$/, "");

export const CAST: readonly CastVoice[] = TALK_CAST.map((o) => ({
	id: o.value,
	name: o.label,
	trait: traitOf(o.description),
}));

export const castVoice = (id: VoiceSlug): CastVoice =>
	CAST.find((v) => v.id === id) ??
	CAST.find((v) => v.id === "vesper") ??
	(CAST[0] as CastVoice);

export const labelIn = (
	options: readonly { id: string; label: string }[],
	id: string
): string => options.find((o) => o.id === id)?.label ?? id;

export function resourceUrl(resource: Resource): string | null {
	switch (resource.type) {
		case "phone":
			return `tel:${resource.value}`;
		case "url":
			return resource.value;
		case "email":
			return `mailto:${resource.value}`;
		default:
			return null;
	}
}

export const opensResource = (resource: Resource): boolean =>
	resourceUrl(resource) !== null;

const REFUSAL_COPY: Readonly<Record<string, string>> = {
	not_reopenable: TALK_COPY.start.notReopenable,
	talk_time_used: TALK_COPY.start.timeUsed,
};

export function talkErrorMessage(error: unknown, fallback: string): string {
	const code = convexErrorCode(error);
	return code !== undefined && Object.hasOwn(REFUSAL_COPY, code)
		? REFUSAL_COPY[code]
		: fallback;
}
