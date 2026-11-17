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
/** Where Sit was opened: a reflection's path, or a kindling twig's replay. */
export type SitFrom = "reflect" | "kindling";
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

/** Close leaves at any beat, without asking; on a kindling's first screen it goes back. */
export const closeLabel = (from: SitFrom, stage: Stage) =>
	from === "kindling" && stage === "pre" ? COPY.backToKindling : COPY.leave;

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
