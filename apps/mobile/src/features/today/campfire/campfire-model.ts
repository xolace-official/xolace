import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

type CohortCard = FunctionReturnType<typeof api.cohort.getWeeklyCohortCard>;
type CampfireStats = FunctionReturnType<typeof api.intake.campfireStats>;

/** What the campfire says, or nothing. */
export type CampfireView =
	/** "38 campers sat with anxiety by the fire this week." */
	| { kind: "count"; count: number; emotion: string }
	/** "Others have sat with anxiety by this fire too." (an honest number isn't there yet) */
	| { kind: "warming"; emotion: string }
	/** The v2 intake's count, until the cohort has a number of its own (#712). */
	| { kind: "stats"; count: number; lighterPercent: number | null };

/**
 * The cohort's card (`cohort.getWeeklyCohortCard`) as the campfire draws it. Hidden falls
 * back to the v2 intake's campfire count, as production's Discovery did; nothing while
 * either is loading or when neither has an honest number.
 */
export function campfireView(
	card: CohortCard | undefined,
	stats: CampfireStats | null,
	v2Intake: boolean
): CampfireView | null {
	if (!card) {
		return null;
	}
	if (card.status === "count") {
		return {
			count: card.count,
			emotion: emotionWords(card.emotion),
			kind: "count",
		};
	}
	if (card.status === "warming") {
		return { emotion: emotionWords(card.emotion), kind: "warming" };
	}
	if (v2Intake && stats) {
		return {
			count: stats.campers,
			kind: "stats",
			lighterPercent: stats.lighterPercent,
		};
	}
	return null;
}

/** "self-doubt" reads as "self doubt", as production's cohort card writes it. */
const emotionWords = (emotion: string) => emotion.replace(/-/g, " ");

/** The sentence after the rolling number, and the whole line for VoiceOver. */
export function campfireLine(view: CampfireView): {
	count: number | null;
	rest: string;
	tail: string;
	label: string;
} {
	if (view.kind === "warming") {
		const text = COPY.campfire.warming(view.emotion);
		return {
			count: null,
			label: `${text} ${COPY.campfire.link}`,
			rest: "",
			tail: text,
		};
	}
	if (view.kind === "count") {
		const rest = COPY.campfire.campers(view.count);
		const tail = COPY.campfire.count(view.emotion);
		return {
			count: view.count,
			label: `${view.count}${rest}${tail} ${COPY.campfire.link}`,
			rest,
			tail,
		};
	}
	const tail = COPY.campfire.stats(view.count);
	const lighter =
		view.lighterPercent === null
			? ""
			: ` ${COPY.campfire.lighter(view.lighterPercent)}`;
	return {
		count: view.count,
		label: `${view.count.toLocaleString()}${tail}${lighter}`,
		rest: "",
		tail: `${tail}${lighter}`,
	};
}
