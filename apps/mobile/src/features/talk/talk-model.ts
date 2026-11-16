/**
 * What Talk shows, from what the talk and the account say (handoff `talk.md`). Pure: no
 * React, no Convex. The voice pipeline (`use-talk.ts`) stays as it is; this reads it.
 */
import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { MIN_TALK_S, talkTimeLine, WEEKLY_TALK_S } from "@/lib/talk/talk-time";
import { TALK_CAST } from "@/lib/talk/voice-options";
import { TALK_COPY } from "./copy";
import type { Presence } from "./use-talk";
import type { Turn } from "./use-thread";

/** One screen, one tree: the start screen, then the talk (§6). */
export type Phase = "start" | "connecting" | "talk" | "ending";

/** Where the talk stands, as the voice pipeline reports it. */
export type TalkStatus = {
	/** Start was pressed and the talk is being set up (or is up). */
	started: boolean;
	connected: boolean;
	/** Connected at least once: the start screen stays down while it ends. */
	wasLive: boolean;
	presence: Presence;
};

/**
 * The start screen until Start is pressed (or "Say more" reopened a talk, which goes
 * straight in); then connecting, the talk and its ending. A talk that fails before it
 * connects comes back to the start screen, with its error.
 */
export function phaseOf(talk: TalkStatus, reopened: boolean): Phase {
	if (!(talk.started || talk.connected || talk.wasLive || reopened)) {
		return "start";
	}
	if (talk.presence === "Ending…") {
		return "ending";
	}
	return talk.connected ? "talk" : "connecting";
}

/** This week's talk time: undefined while it loads, null off Plus (the server refuses). */
export type WeekLeft = number | null | undefined;

/** Under the minimum Start can't be pressed (#582). Unknown isn't low. */
export const isLow = (week: WeekLeft): boolean =>
	week != null && week < MIN_TALK_S;

/** The short time fact on the start screen (§2.5). Unknown reads as a full week. */
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

/** What's kept's clock row: production's `talkTimeLine`, or the full-week line (§2.7). */
export const keptTimeLine = (week: WeekLeft): string =>
	(week == null ? null : talkTimeLine(week)) ?? TALK_COPY.kept.full;

/** Before "What's kept" under Start: low time first, then the first talk's mic line (§2.6). */
export function footnoteLead(week: WeekLeft, micAsk: boolean): string {
	if (isLow(week)) {
		return TALK_COPY.start.footnote.low;
	}
	return micAsk ? TALK_COPY.start.footnote.mic : "";
}

/** `m:ss`. */
export const clockOf = (seconds: number): string =>
	`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The clock shows only from the spoken wrap-up cue (#584). */
export const isLate = (secondsLeft: number | null, fromS: number): boolean =>
	secondsLeft !== null && secondsLeft <= fromS;

/** The title pill's second line: the presence, and from the wrap-up cue the clock. */
export function pillLine(
	presence: Presence,
	secondsLeft: number | null,
	fromS: number
): string {
	return secondsLeft !== null && isLate(secondsLeft, fromS)
		? TALK_COPY.live.clock(presence, clockOf(secondsLeft))
		: presence;
}

/** The ⋯ menu's header: the minutes left mid-talk, "Talk options" before it. */
export const menuTitle = (minutesLeft: number | null): string =>
	minutesLeft === null
		? TALK_COPY.start.options
		: TALK_COPY.live.menuHead(minutesLeft);

/** Lines the person finished: the face nods at each new one. */
export const heardCount = (turns: readonly Turn[]): number =>
	turns.filter((t) => t.speaker === "person").length;

/**
 * A line that came in as speech fades in word by word (the companion's as it speaks,
 * yours as it's transcribed). Typed lines and a reopened thread arrive whole.
 */
export const streams = (turn: Turn): boolean =>
	turn.live === true || (turn.speaker === "person" && turn.via === "voice");

export type CastVoice = { id: VoiceSlug; name: string; trait: string };

/** The first sentence of a voice's description, without its stop (§2.3). */
export const traitOf = (description: string): string =>
	(description.split(". ")[0] ?? description).replace(/\.$/, "");

/** The four pills: Sage, Wren, Vesper, Ash, from production's catalog. */
export const CAST: readonly CastVoice[] = TALK_CAST.map((o) => ({
	id: o.value,
	name: o.label,
	trait: traitOf(o.description),
}));

/** The voice line's voice; Vesper for one this build doesn't list. */
export const castVoice = (id: VoiceSlug): CastVoice =>
	CAST.find((v) => v.id === id) ??
	CAST.find((v) => v.id === "vesper") ??
	(CAST[0] as CastVoice);

/** A choice's label in a list of `{ id, label }`. */
export const labelIn = (
	options: readonly { id: string; label: string }[],
	id: string
): string => options.find((o) => o.id === id)?.label ?? id;

/** Where tapping a help resource goes: a call, a page or a mail; a text line only shows. */
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
