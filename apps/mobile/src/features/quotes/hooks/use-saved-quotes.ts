import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { patchSaved } from "@/features/quotes/hooks/use-today-quote";
import { useStablePaginatedQuery } from "@/lib/convex/use-stable-query";

/** Kept quotes, newest first. Stable (#311) so a reset never blanks the list; `status`
 * therefore never shows `LoadingMore`. */
export function useSavedQuotes(initialNumItems = 12) {
	const page = useStablePaginatedQuery(
		api.dailyQuotes.listSaved,
		{},
		{ initialNumItems }
	);
	const unsaveQuote = useMutation(api.dailyQuotes.unsave).withOptimisticUpdate(
		// -1 outright: the chip only exists inside an open, saved card.
		(store, args) => patchSaved(store, args.quoteId, false, -1)
	);
	const posthog = usePostHog();

	// The count strip reads `getToday`, so the star's optimistic patch runs here
	// too. The event is captured only once the write landed.
	const unsave = async (
		quoteId: Id<"daily_quotes">,
		type: "session" | "curated"
	) => {
		try {
			await unsaveQuote({ quoteId });
			posthog.capture("quote_unsaved", { quote_type: type });
		} catch (e) {
			console.error("[quotes] unsave failed", e);
		}
	};

	return { ...page, unsave };
}
