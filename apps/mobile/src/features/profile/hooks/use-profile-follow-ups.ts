import { api } from "@xolace/backend/convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

export type ProfileFollowUp = FunctionReturnType<
	typeof api.followUps.profileOpenCards
>["waiting"][number];

export type FollowUpListItem =
	| { kind: "header"; key: string; title: string; caption?: string }
	| { kind: "card"; key: string; card: ProfileFollowUp }
	| { kind: "empty"; key: string };

const PAGE_SIZE = 20;
// Open cards are pinned in their own groups, so the history skips them.
const OPEN = new Set<ProfileFollowUp["status"]>([
	"pending",
	"ready",
	"shown",
	"superseded",
]);

const monthTitle = (ts: number) =>
	new Date(ts).toLocaleDateString(undefined, {
		month: "long",
		year: "numeric",
	});

/** The open-card groups only; cheap enough for the tab bar's count. */
export function useFollowUpsWaitingCount(): number {
	return useQuery(api.followUps.profileOpenCards, {})?.waiting.length ?? 0;
}

/** Follow-ups tab rows: waiting on the user, coming up, then the paged history
 * under month headers. `items` is undefined until both reads land. */
export function useProfileFollowUps() {
	const open = useQuery(api.followUps.profileOpenCards, {});
	const history = usePaginatedQuery(
		api.followUps.listForProfilePage,
		{},
		{ initialNumItems: PAGE_SIZE }
	);

	const loadMore = () => {
		if (history.status === "CanLoadMore") {
			history.loadMore(PAGE_SIZE);
		}
	};

	if (!open || history.status === "LoadingFirstPage") {
		return { isLoadingMore: false, items: undefined, loadMore };
	}

	const items: FollowUpListItem[] = [];
	if (open.waiting.length > 0) {
		// Ready cards open a check-in; superseded ones only close.
		const canCheckIn = open.waiting.some((c) => c.status !== "superseded");
		items.push({
			caption: canCheckIn
				? "Tap one to check in."
				: "No check-in is coming for these. Close them when you're ready.",
			key: "h-waiting",
			kind: "header",
			title: "Waiting on you",
		});
		for (const card of open.waiting) {
			items.push({ card, key: card._id, kind: "card" });
		}
	}
	if (open.upcoming.length > 0) {
		items.push({
			caption: "We'll check back in on these.",
			key: "h-upcoming",
			kind: "header",
			title: "Coming up",
		});
		for (const card of open.upcoming) {
			items.push({ card, key: card._id, kind: "card" });
		}
	}

	let month: string | null = null;
	for (const card of history.results) {
		if (OPEN.has(card.status)) {
			continue;
		}
		const title = monthTitle(card.createdAt);
		if (title !== month) {
			month = title;
			items.push({ key: `h-${title}`, kind: "header", title });
		}
		items.push({ card, key: card._id, kind: "card" });
	}

	if (items.length === 0 && history.status === "Exhausted") {
		items.push({ key: "empty", kind: "empty" });
	}

	return {
		isLoadingMore: history.status === "LoadingMore",
		items,
		loadMore,
	};
}
