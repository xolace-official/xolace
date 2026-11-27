import type { api } from "@xolace/backend/convex/_generated/api";
import { intakeAnswerValidators } from "@xolace/backend/convex/lib/validators";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { startOfDay } from "@/lib/date";
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
} from "@/lib/intake/questions";

type DeferredQuestion = FunctionReturnType<
	typeof api.intake.deferred.missing
>[number];

const FIRST_DAY = 3;
const DAY_MS = 86_400_000;

const localDaysBetween = (from: Date, to: Date) =>
	Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

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
export type FindingPicks = Partial<Omit<FindingAnswer, "question">>;

export function findingAnswer(picks: FindingPicks): FindingAnswer | null {
	const { acquisitionSource, seriesSeen, seriesWantInApp } = picks;
	if (acquisitionSource === undefined) {
		return null;
	}
	if (acquisitionSource !== SERIES_BRANCH_VALUE) {
		return { acquisitionSource, question: "acquisitionSource" };
	}
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

export type FindingStep = {
	choices: readonly IntakeChoice[];
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
		return acquisitionSource ? { acquisitionSource } : picks;
	},
	question: SOURCE_QUESTION.question,
};

const SEEN_STEP: FindingStep = {
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
	pick: (picks, value) => ({ ...picks, seriesWantInApp: value === "true" }),
	question: SERIES_WANT_QUESTION,
};

export function findingStep(picks: FindingPicks): FindingStep {
	if (picks.acquisitionSource === undefined) {
		return SOURCE_STEP;
	}
	return picks.seriesSeen === undefined ? SEEN_STEP : WANT_STEP;
}
