import { LegendList } from "@legendapp/list/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { canSeedReflection } from "@/src/features/quotes/components/archive/reply-seed";
import {
	PEEK,
	StackedQuoteCard,
} from "@/src/features/quotes/components/archive/stacked-quote-card";
import { useSavedQuotes } from "@/src/features/quotes/hooks/use-saved-quotes";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/src/store/store";

/**
 * The kept quotes, one card per row.
 *
 * Normal flow with a negative bottom margin — the peek is `PEEK - COLLAPSED`,
 * so opening a card is only that card's own height changing and the list
 * reflows everything below it. That is what makes the rows virtualisable, so
 * 24+ kept quotes need no "View all" cap (#296).
 */
export function QuoteStack({
	openId,
	onToggle,
}: {
	openId: Id<"daily_quotes"> | null;
	onToggle: (id: Id<"daily_quotes"> | null) => void;
}) {
	const { results, status, loadMore, unsave } = useSavedQuotes();
	const reduced = useEffectiveReducedMotion();
	const router = useRouter();
	const setReplySeed = useAppStore((s) => s.setReplySeed);
	const posthog = usePostHog();

	// One query for the whole stack, not one per card. `undefined` while it
	// loads counts as active, so the offer appears only once we know it is safe
	// — accepting into a waiting mirror is the failure it guards (#316).
	const activeSession = useQuery(api.sessions.getActive);
	const hasActiveSession = activeSession !== null;

	if (status === "LoadingFirstPage") {
		return null;
	}

	// Empty is its own composition, not the stack at n=0. One card, by contrast,
	// is the ordinary stack with one row — no peek band, no code path.
	if (results.length === 0) {
		return (
			<View className="items-center gap-2 py-20">
				<AppText className="font-poster-display text-foreground text-lg tracking-[1.2px]">
					Nothing kept yet
				</AppText>
				<AppText className="font-poster-body text-[13.5px] text-foreground/65">
					Star a quote and it waits here for you.
				</AppText>
			</View>
		);
	}

	return (
		<LegendList
			contentContainerStyle={styles.content}
			data={results}
			estimatedItemSize={PEEK}
			extraData={openId}
			keyExtractor={(item) => item._id}
			onEndReached={status === "CanLoadMore" ? () => loadMore(12) : undefined}
			onEndReachedThreshold={0.4}
			recycleItems
			renderItem={({ item, index }) => (
				<StackedQuoteCard
					hasActiveSession={hasActiveSession}
					index={index}
					isOpen={item._id === openId}
					// The reply seeds the screen, never `rawInput` (#316): it becomes the
					// reflect card's line and the composer opens empty under it, so the
					// ordinary typed path initiates with `open_prompt`. Through the store
					// rather than a route param — this is raw user text, and params ride
					// in navigation state and history.
					onSeed={() => {
						if (!item.reply) {
							return;
						}
						posthog.capture("quote_reflection_seeded", {
							quote_type: item.type,
							reply_length: item.reply.length,
						});
						setReplySeed(item.reply);
						router.replace("/");
					}}
					onToggle={() => {
						const opening = item._id !== openId;
						// Only the open counts: a close is the same tap and would double
						// every card. `seedable` rides along so the offer has an
						// impression denominator without a second event (#316).
						if (opening) {
							posthog.capture("quote_archive_card_opened", {
								has_reply: Boolean(item.reply?.trim()),
								quote_type: item.type,
								seedable: canSeedReflection(item, hasActiveSession),
							});
						}
						onToggle(opening ? item._id : null);
					}}
					onUnsave={() => {
						if (openId === item._id) {
							onToggle(null);
						}
						void unsave(item._id, item.type);
					}}
					quote={item}
					reduced={reduced}
				/>
			)}
			showsVerticalScrollIndicator={false}
		/>
	);
}

const styles = {
	content: { paddingBottom: 40, paddingHorizontal: 14, paddingTop: 8 },
} as const;
