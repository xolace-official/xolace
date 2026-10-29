import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import { PressableFeedback } from "heroui-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	type CSSTransitionProperties,
	cubicBezier,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { formatDate } from "@/features/quotes/components/archive/archive-date";
import { canSeedReflection } from "@/features/quotes/components/archive/reply-seed";
import { ARCHIVE_TINT_VARS } from "@/features/quotes/poster-palette";

/** How much of a closed card the card below leaves showing. */
export const PEEK = 146;
const COLLAPSED = 172;
/** Floor for an open card so a two-line quote still reads as a card. */
const MIN_EXPANDED = 288;
const GAP = 16;
// Constant, never a `flex: 1` spacer: a flexed gap tracks the animated-height
// box, so the title travels every frame (#296).
const TITLE_GAP = 44;
const CARD_PAD_V = 18;

const CARD_EASE = cubicBezier(0.4, 0, 0.2, 1);
// A CSS transition, not `withSpring(height)` (a Yoga pass per frame) and not a
// layout animation (LegendList reclaims the row on close, so it snapped). The
// curve matters: a quint-out read as no animation at all.
const CARD_TRANSITION: CSSTransitionProperties = {
	transitionDuration: 340,
	transitionProperty: ["height", "marginBottom"],
	transitionTimingFunction: CARD_EASE,
};
// Not FadeIn/FadeOut: an exiting child runs its own unmount clock while the
// parent shrinks. The body stays mounted at opacity 0.
const BODY_TRANSITION: CSSTransitionProperties = {
	transitionDuration: 220,
	transitionProperty: ["opacity"],
	transitionTimingFunction: CARD_EASE,
};

export function StackedQuoteCard({
	quote,
	index,
	isOpen,
	reduced,
	hasActiveSession,
	onToggle,
	onUnsave,
	onSeed,
}: {
	quote: Doc<"daily_quotes">;
	index: number;
	isOpen: boolean;
	reduced: boolean;
	hasActiveSession: boolean;
	onToggle: () => void;
	onUnsave: () => void;
	onSeed: () => void;
}) {
	const [shadow, ...tints] = useCSSVariable([
		"--color-poster-shadow",
		...ARCHIVE_TINT_VARS,
	]) as string[];

	// A CSS transition cannot animate to `auto`, so onLayout supplies the open
	// height. Keyed by the quote: `recycleItems` reuses this instance, and an
	// unkeyed height would open the next card at the last card's size for a frame.
	const [measured, setMeasured] = useState({ height: 0, id: quote._id });
	const contentHeight = measured.id === quote._id ? measured.height : 0;
	const expanded = Math.max(MIN_EXPANDED, contentHeight + CARD_PAD_V * 2);

	const seedable = canSeedReflection(quote, hasActiveSession);

	const { dayMonth, weekday } = formatDate(quote.date);
	const meta =
		quote.reaction === "resonates" ? `${weekday}, resonated` : weekday;

	return (
		<Animated.View
			style={{
				height: isOpen ? expanded : COLLAPSED,
				marginBottom: isOpen ? GAP : PEEK - COLLAPSED,
				// Without this the peek band covers the next card's date line.
				zIndex: isOpen ? 9999 : index,
				...(reduced ? null : CARD_TRANSITION),
			}}
		>
			<Pressable
				accessibilityLabel={quote.title ?? "Saved quote"}
				accessibilityRole="button"
				accessibilityState={{ expanded: isOpen }}
				onPress={() => {
					Presets.flick();
					onToggle();
				}}
				style={[
					styles.card,
					{ backgroundColor: tints[index % tints.length], shadowColor: shadow },
				]}
			>
				<View
					onLayout={(e) =>
						setMeasured({ height: e.nativeEvent.layout.height, id: quote._id })
					}
				>
					<AppText className="font-poster-body text-[12.5px] text-poster-ink">
						{dayMonth}
					</AppText>
					<AppText className="mt-px font-poster-body text-[12.5px] text-poster-ink-soft">
						{meta}
					</AppText>

					<View style={styles.titleGap} />

					<AppText
						className="font-poster-display text-[30px] text-poster-ink tracking-[-0.6px]"
						numberOfLines={1}
					>
						{quote.title ?? "Kept quote"}
					</AppText>

					<Animated.View
						accessibilityElementsHidden={!isOpen}
						importantForAccessibility={isOpen ? "auto" : "no-hide-descendants"}
						pointerEvents={isOpen ? "auto" : "none"}
						style={[
							styles.body,
							{ opacity: isOpen ? 1 : 0 },
							reduced ? null : BODY_TRANSITION,
						]}
					>
						<AppText className="mb-3.5 font-poster-body text-[14px] text-poster-ink-soft leading-5.5">
							{quote.text}
						</AppText>
						{/* The reply and one onward ask (#316). Accepting opens the composer
						 * empty: #300 already embeds these words once. */}
						{seedable && (
							<View className="mb-3.5 rounded-2xl border border-poster-hairline px-4 py-3">
								<AppText className="font-poster-display text-[12.5px] text-poster-ink tracking-[1px]">
									YOU WROTE BACK
								</AppText>
								<AppText
									className="mt-1 font-poster-body text-[13.5px] text-poster-ink-soft leading-5"
									numberOfLines={3}
								>
									{quote.reply}
								</AppText>
								<PressableFeedback
									accessibilityLabel="Start a reflection from your reply"
									accessibilityRole="button"
									onPress={onSeed}
								>
									<AppText className="mt-2.5 font-poster-body font-semibold text-[13.5px] text-poster-ink underline">
										Start something from this →
									</AppText>
								</PressableFeedback>
							</View>
						)}

						<PressableFeedback
							accessibilityLabel="Remove from saved"
							accessibilityRole="button"
							className="self-start rounded-full bg-poster-chip px-4 py-2"
							onPress={onUnsave}
						>
							<AppText className="font-poster-body text-[12.5px] text-poster-ink">
								Unsave
							</AppText>
						</PressableFeedback>
					</Animated.View>
				</View>
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	body: { marginTop: 12 },
	card: {
		borderRadius: 22,
		elevation: 8,
		flex: 1,
		overflow: "hidden",
		paddingHorizontal: 20,
		paddingVertical: CARD_PAD_V,
		shadowOffset: { height: 14, width: 0 },
		shadowOpacity: 0.22,
		shadowRadius: 30,
	},
	titleGap: { height: TITLE_GAP },
});
