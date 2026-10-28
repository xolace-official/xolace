import { LegendList } from "@legendapp/list/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { canSeedReflection } from "@/features/quotes/components/archive/reply-seed";
import {
	PEEK,
	StackedQuoteCard,
} from "@/features/quotes/components/archive/stacked-quote-card";
import { useSavedQuotes } from "@/features/quotes/hooks/use-saved-quotes";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";

/** Kept quotes, one card per row with a negative bottom margin, so opening a card only changes
 * its own height (#296). */
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

	// One query for the whole stack. `undefined` while loading counts as active,
	// so the offer appears only once it is known to be safe (#316).
	const activeSession = useQuery(api.sessions.getActive);
	const hasActiveSession = activeSession !== null;

	if (status === "LoadingFirstPage") {
		return null;
	}

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
					// Seeds the reflect card's line, never `rawInput` (#316). Through the
					// store, not a route param: raw user text must not ride in navigation history.
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
						// Only the open counts; `seedable` gives the offer an impression
						// denominator (#316).
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
