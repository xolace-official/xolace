import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

type CohortCard = FunctionReturnType<typeof api.cohort.getWeeklyCohortCard>;
type CampfireStats = FunctionReturnType<typeof api.intake.campfireStats>;

export type CampfireView =
	| { kind: "count"; count: number; emotion: string }
	| { kind: "warming"; emotion: string }
	| { kind: "stats"; count: number; lighterPercent: number | null };

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

const emotionWords = (emotion: string) => emotion.replace(/-/g, " ");

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
