import type { Doc } from "@xolace/backend/dataModel";
import { ERROR_CODES, EXERCISE_MAX_SWAPS } from "@xolace/backend/shared";
import { convexErrorCode } from "@/lib/convex-error-code";
import { COPY } from "./copy";
import { shortLength } from "./sit-timing";

export type CatalogueStep = Doc<"exercises">["steps"][number];
export type CatalogueExercise = Pick<
	Doc<"exercises">,
	"_id" | "title" | "steps"
>;
export type Slots = Readonly<Record<string, string>>;

export type BreathPattern = "sigh" | "ext" | "slow";
export type HandIntensity = "light" | "medium" | "heavy";

export type Beat =
	| { k: "text" | "mirror"; t: string; s: number }
	| {
			k: "breath" | "sync";
			t: string | readonly [string, string];
			pat: BreathPattern;
			cyc: number;
	  }
	| { k: "haptic"; t: string; s: number; intensity: HandIntensity }
	| { k: "prompt"; t: string };
export type BeatKind = Beat["k"];

export type Exercise = {
	key: string;
	id: string;
	name: string;
	beats: readonly Beat[];
};

export type Stage = "pre" | "play" | "close";
export type SitFrom = "reflect" | "kindling" | "today" | "letter";

export function sitFrom(param: string | undefined): SitFrom {
	return param === "kindling" || param === "today" || param === "letter"
		? param
		: "reflect";
}

const playsAlone = (from: SitFrom) => from === "today" || from === "letter";

export const isStandalone = (from: SitFrom) => from !== "reflect";

export const TODAY_EXERCISE = "reset";

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

export type ArcSize = "full" | "small" | "mid" | "gone";

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
	linkOn: boolean;
	sheetOpen: boolean;
};

export function canSwap(s: SwapLink): boolean {
	if (s.from !== "reflect" || s.swaps >= EXERCISE_MAX_SWAPS || s.sheetOpen) {
		return false;
	}
	if (s.stage === "pre") {
		return true;
	}
	return s.stage === "play" && s.kind !== "prompt" && s.linkOn;
}

export type SwapChoice = { id: string; title: string; sub: string };

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

const SWAP_REFUSED: readonly (string | undefined)[] = [
	ERROR_CODES.swapLimitReached,
	ERROR_CODES.swapNotAllowed,
];
const SWAP_REFUSED_BEFORE_CODES = [
	"Maximum swaps reached",
	"Exercise not allowed",
];

export function isSwapRefused(error: unknown): boolean {
	if (SWAP_REFUSED.includes(convexErrorCode(error))) {
		return true;
	}
	const message = error instanceof Error ? error.message : "";
	return SWAP_REFUSED_BEFORE_CODES.some((s) => message.includes(s));
}
