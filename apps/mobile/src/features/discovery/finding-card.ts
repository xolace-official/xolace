// Discovery's day-3 "How did you find Xolace?" card (#711): when it shows, and what it saves.
import type { api } from "@xolace/backend/convex/_generated/api";
import { intakeAnswerValidators } from "@xolace/backend/convex/lib/validators";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import {
	type IntakeChoice,
	SECTION_FINDING,
	SERIES_BRANCH_VALUE,
	SERIES_NOT_SEEN,
	SERIES_NOT_SEEN_LABEL,
	SERIES_SEEN_QUESTION,
	SERIES_SEEN_RATINGS,
	SERIES_WANT_CHOICES,
	SERIES_WANT_QUESTION,
} from "@/features/intake/questions";
import { startOfDay } from "@/lib/date";

type DeferredQuestion = FunctionReturnType<
	typeof api.intake.deferred.missing
>[number];

/** The intake day is day 1. Attribution only, so it waits until they've come back. */
const FIRST_DAY = 3;
const DAY_MS = 86_400_000;

/** Calendar days between two instants in device-local time; rounded, so a DST day still
 * counts as one. */
const localDaysBetween = (from: Date, to: Date) =>
	Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

/** Whether Discovery shows the card: their third local day or later, still unanswered, and
 * not put away with "Not now" by this account. */
export function findingCardDue(args: {
	completedAt: number;
	dismissed: boolean;
	missing: readonly DeferredQuestion[];
	now: Date;
}): boolean {
	return (
		!args.dismissed &&
		args.missing.includes("acquisitionSource") &&
		localDaysBetween(new Date(args.completedAt), args.now) >= FIRST_DAY - 1
	);
}

type DeferredAnswer = FunctionArgs<typeof api.intake.deferred.record>["answer"];
export type FindingAnswer = Extract<
	DeferredAnswer,
	{ question: "acquisitionSource" }
>;
/** What the card has picked so far. */
export type FindingPicks = Partial<Omit<FindingAnswer, "question">>;

/** The answer to save, or null while the card still has a question to ask. */
export function findingAnswer(picks: FindingPicks): FindingAnswer | null {
	const { acquisitionSource, seriesSeen, seriesWantInApp } = picks;
	if (acquisitionSource === undefined) {
		return null;
	}
	if (acquisitionSource !== SERIES_BRANCH_VALUE) {
		return { acquisitionSource, question: "acquisitionSource" };
	}
	// The server rejects a half-filled pair, so the card asks both first.
	if (seriesSeen === undefined || seriesWantInApp === undefined) {
		return null;
	}
	return {
		acquisitionSource,
		question: "acquisitionSource",
		seriesSeen,
		seriesWantInApp,
	};
}

/** One question on the card. `pick` folds a tapped choice into the picks. */
export type FindingStep = {
	choices: readonly IntakeChoice[];
	/** "Not now" puts the card away; a follow-up offers Back instead, since putting it away
	 * there would drop the source the server can't take without the series pair. */
	dismissible: boolean;
	pick: (picks: FindingPicks, value: string) => FindingPicks;
	question: string;
};

const SOURCE_QUESTION = SECTION_FINDING.find(
	(q) => q.name === "acquisitionSource"
);
if (!SOURCE_QUESTION) {
	throw new Error("SECTION_FINDING lost its acquisitionSource question");
}

const SOURCES = intakeAnswerValidators.acquisitionSource.members.map(
	(m) => m.value
);
const SEEN = intakeAnswerValidators.seriesSeen.members.map((m) => m.value);

const SOURCE_STEP: FindingStep = {
	choices: SOURCE_QUESTION.choices,
	dismissible: true,
	pick: (picks, value) => {
		const acquisitionSource = SOURCES.find((s) => s === value);
		// A new source starts the branch over.
		return acquisitionSource ? { acquisitionSource } : picks;
	},
	question: SOURCE_QUESTION.question,
};

const SEEN_STEP: FindingStep = {
	// The intake's "Yes" then a rating, flattened into one tap.
	choices: [
		...SERIES_SEEN_RATINGS,
		{ label: SERIES_NOT_SEEN_LABEL, value: SERIES_NOT_SEEN },
	],
	dismissible: false,
	pick: (picks, value) => {
		const seriesSeen = SEEN.find((s) => s === value);
		return seriesSeen ? { ...picks, seriesSeen } : picks;
	},
	question: SERIES_SEEN_QUESTION,
};

const WANT_STEP: FindingStep = {
	choices: SERIES_WANT_CHOICES,
	dismissible: false,
	// The intake holds Q11 as a "true"/"false" choice; the answer is a boolean.
	pick: (picks, value) => ({ ...picks, seriesWantInApp: value === "true" }),
	question: SERIES_WANT_QUESTION,
};

/** The question still open: the source, then the series pair after short video. Not
 * called once `findingAnswer` has an answer. */
export function findingStep(picks: FindingPicks): FindingStep {
	if (picks.acquisitionSource === undefined) {
		return SOURCE_STEP;
	}
	return picks.seriesSeen === undefined ? SEEN_STEP : WANT_STEP;
}
