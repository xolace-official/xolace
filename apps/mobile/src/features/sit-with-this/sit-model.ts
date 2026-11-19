/**
 * Sit with this, pure: the words the feature works in (a beat, an exercise,
 * the run's stage) and what the screen shows around the beats: the arcs' size,
 * close's label, "Something different", the sheet's options. The catalogue's
 * steps become beats in `catalogue.ts`; how long each lasts is `sit-timing.ts`.
 * No React, no Convex.
 */
import type { Doc } from "@xolace/backend/dataModel";
import { COPY } from "./copy";
import { shortLength } from "./sit-timing";

export type CatalogueStep = Doc<"exercises">["steps"][number];
/** What the screen needs of an `exercises` document. */
export type CatalogueExercise = Pick<
	Doc<"exercises">,
	"_id" | "title" | "steps"
>;
/** `getForSession`'s filled slots (`mirror_line`, `user_phrase`, `user_emotion`). */
export type Slots = Readonly<Record<string, string>>;

/** Production's `TIMINGS` keys: physiological sigh, extended exhale, slow exhale. */
export type BreathPattern = "sigh" | "ext" | "slow";
export type HandIntensity = "light" | "medium" | "heavy";

export type Beat =
	| { k: "text" | "mirror"; t: string; s: number }
	| {
			k: "breath" | "sync";
			/** One line, or Make room's in-line and out-line, one per phase. */
			t: string | readonly [string, string];
			pat: BreathPattern;
			cyc: number;
	  }
	| { k: "haptic"; t: string; s: number; intensity: HandIntensity }
	| { k: "prompt"; t: string };
export type BeatKind = Beat["k"];

export type Exercise = {
	/** The catalogue document: the run restarts when it changes (a swap). */
	key: string;
	/** The catalogue's title (`let_it_land`, `reset` …). */
	id: string;
	name: string;
	beats: readonly Beat[];
};

export type Stage = "pre" | "play" | "close";
/**
 * Where Sit was opened: a reflection's path, a kindling twig's replay, Today's Sit door, or a
 * letter's care sheet ("Breathe with me first"). The last two play Three breaths on its own,
 * outside any session.
 */
export type SitFrom = "reflect" | "kindling" | "today" | "letter";

/** The route's `from`: anything unknown is a reflection, as before Today and kindling. */
export function sitFrom(param: string | undefined): SitFrom {
	return param === "kindling" || param === "today" || param === "letter"
		? param
		: "reflect";
}

/** Today's door and a letter's care play the standalone exercise, with no session. */
const playsAlone = (from: SitFrom) => from === "today" || from === "letter";

/** Outside a reflection, Sit runs on its own: no path to start or complete, no swap. */
export const isStandalone = (from: SitFrom) => from !== "reflect";

/** What Today's Sit door plays: Three breaths. */
export const TODAY_EXERCISE = "reset";

/**
 * Where Sit reads its exercise: a reflection's path session (`getForSession`), a kindling
 * twig's completed session from the route, or, from Today or a letter, the standalone exercise
 * (`getStandalone`) with no session at all.
 */
export function sitSource<Id extends string>(
	from: SitFrom,
	ids: { path: Id | null; route: Id | undefined }
): { sessionId: Id | null; standalone: typeof TODAY_EXERCISE | null } {
	if (playsAlone(from)) {
		return { sessionId: null, standalone: TODAY_EXERCISE };
	}
	return {
		sessionId: from === "kindling" ? (ids.route ?? null) : ids.path,
		standalone: null,
	};
}

/**
 * The exercise and slots Sit plays, from whichever read its source uses: a standalone
 * exercise has no slots (its mirror lines fall back to their default copy). Undefined
 * while it loads, null with none.
 */
export function sitResult<E>(
	from: SitFrom,
	forSession: { exercise: E; slots: Slots } | null | undefined,
	standalone: E | null | undefined
): { exercise: E; slots: Slots } | null | undefined {
	if (!playsAlone(from)) {
		return forSession;
	}
	return standalone && { exercise: standalone, slots: {} };
}
/** Production allows two swaps (`exercises.recordSwap`). */
const MAX_SWAPS = 2;

export type ArcSize = "full" | "small" | "mid" | "gone";

/** The arcs never leave: small above a line, full to breathe, mid for the hand, gone to write. */
export function arcSize(stage: Stage, kind: BeatKind): ArcSize {
	if (stage === "pre") {
		return "small";
	}
	if (stage === "close") {
		return "full";
	}
	switch (kind) {
		case "breath":
		case "sync":
			return "full";
		case "haptic":
			return "mid";
		case "prompt":
			return "gone";
		default:
			return "small";
	}
}

export const isBreathing = (k: BeatKind) => k === "breath" || k === "sync";

/** Close leaves at any beat, without asking; on the first screen it says where it goes back to. */
export function closeLabel(from: SitFrom, stage: Stage): string {
	if (stage === "pre" && from === "kindling") {
		return COPY.backToKindling;
	}
	if (stage === "pre" && from === "today") {
		return COPY.backToToday;
	}
	if (stage === "pre" && from === "letter") {
		return COPY.backToLetter;
	}
	return COPY.leave;
}

type SwapLink = {
	from: SitFrom;
	swaps: number;
	stage: Stage;
	kind: BeatKind;
	/** "Something different" has waited its 3 s of playing. */
	linkOn: boolean;
	sheetOpen: boolean;
};

/**
 * "Something different": only within a reflection (a kindling replay can't
 * swap), at most twice, never while writing or with the sheet already up. On
 * the first screen at once; while playing, after 3 s.
 */
export function canSwap(s: SwapLink): boolean {
	if (s.from !== "reflect" || s.swaps >= MAX_SWAPS || s.sheetOpen) {
		return false;
	}
	if (s.stage === "pre") {
		return true;
	}
	return s.stage === "play" && s.kind !== "prompt" && s.linkOn;
}

export type SwapChoice = { id: string; title: string; sub: string };

/**
 * The sheet's two options (`exercises.getSwapOptions`): reset, unless it's
 * already playing (fix: production would swap to the same exercise), and the
 * next best. Each with its name and real length.
 */
export function swapChoices(
	options: { reset: Exercise | null; nextBest: Exercise | null },
	currentId: string | null
): SwapChoice[] {
	const out: SwapChoice[] = [];
	const add = (ex: Exercise | null, title: string) => {
		if (ex) {
			out.push({ id: ex.key, sub: `${ex.name} · ${shortLength(ex)}`, title });
		}
	};
	if (options.reset?.id !== currentId) {
		add(options.reset, COPY.sheet.simpler);
	}
	add(options.nextBest, COPY.sheet.other);
	return out;
}
