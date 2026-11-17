/**
 * The Follow-ups tab's rows from production's two reads (`followUps.profileOpenCards`, the
 * paged `followUps.listForProfilePage`): Waiting, Coming up, then Earlier. Pure.
 */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/you/copy";

type Open = FunctionReturnType<typeof api.followUps.profileOpenCards>;
export type FollowUpCard = Open["waiting"][number];

/** What a row says and does. */
export type FollowUpLook =
	/** Ready or shown: the check-in waits; tapping opens it. */
	| { kind: "check-in"; from: string }
	/** Superseded: no check-in is coming; tapping closes it. */
	| { kind: "close"; from: string }
	/** Pending: the check-in hasn't come due. */
	| { kind: "coming" }
	/** Resolved or expired: a record, with the answer on the right. */
	| { kind: "past"; when: string; answer: string; answered: boolean };

export type FollowUpItem =
	| { kind: "header"; key: string; title: string }
	| { kind: "card"; key: string; card: FollowUpCard; look: FollowUpLook }
	| { kind: "empty"; key: string };

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
});

export function lookOf(card: FollowUpCard): FollowUpLook {
	const from = COPY.followUps.from(WEEKDAY.format(card.createdAt));
	switch (card.status) {
		case "ready":
		case "shown":
			return { from, kind: "check-in" };
		case "superseded":
			return { from, kind: "close" };
		case "pending":
			return { kind: "coming" };
		case "resolved":
			return {
				answer:
					COPY.followUps.answers[card.userResponse ?? "dismissed"] ??
					COPY.followUps.answered,
				answered:
					card.userResponse !== undefined && card.userResponse !== "dismissed",
				kind: "past",
				when: SHORT_DATE.format(card.createdAt),
			};
		default:
			return {
				answer: COPY.followUps.noAnswer,
				answered: false,
				kind: "past",
				when: SHORT_DATE.format(card.createdAt),
			};
	}
}

/** Cards waiting on an answer: the tab's badge. */
export const waitingCount = (open: Open | undefined) =>
	open?.waiting.length ?? 0;

/**
 * Waiting, Coming up, then Earlier: the history skips cards already pinned above (the open
 * groups are capped per status, so older open cards fall through to it rather than vanish).
 * Empty only once the history is exhausted.
 */
export function followUpItems(
	open: Open,
	history: readonly FollowUpCard[],
	exhausted: boolean
): FollowUpItem[] {
	const items: FollowUpItem[] = [];
	const card = (c: FollowUpCard): FollowUpItem => ({
		card: c,
		key: c._id,
		kind: "card",
		look: lookOf(c),
	});
	if (open.waiting.length > 0) {
		items.push({
			key: "h-waiting",
			kind: "header",
			title: COPY.followUps.waiting,
		});
		items.push(...open.waiting.map(card));
	}
	if (open.upcoming.length > 0) {
		items.push({
			key: "h-coming",
			kind: "header",
			title: COPY.followUps.comingUp,
		});
		items.push(...open.upcoming.map(card));
	}
	const pinned = new Set([...open.waiting, ...open.upcoming].map((c) => c._id));
	const earlier = history.filter((c) => !pinned.has(c._id));
	if (earlier.length > 0) {
		items.push({
			key: "h-earlier",
			kind: "header",
			title: COPY.followUps.earlier,
		});
		items.push(...earlier.map(card));
	}
	if (items.length === 0 && exhausted) {
		items.push({ key: "empty", kind: "empty" });
	}
	return items;
}
