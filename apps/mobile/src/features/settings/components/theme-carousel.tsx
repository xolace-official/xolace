import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	scrollTo,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { getInitialThemeCarouselIndex } from "@/features/settings/components/get-initial-theme-carousel-index";
import { ThemeCarouselGlow } from "@/features/settings/components/theme-carousel-glow";
import { ThemeCarouselItem } from "@/features/settings/components/theme-carousel-item";
import { ThemePreviewCard } from "@/features/settings/components/theme-preview-card";
import { FREE_THEMES, PREMIUM_THEMES } from "@/lib/themes";

const CARD_WIDTH = 164;
const CARD_GAP = 14;
const DIVIDER_WIDTH = 28;
// Matches the `mx-5` outer margin below (20px), so viewport-centering math
// uses the carousel's actual rendered width, not the full window width.
const SECTION_INSET = 20;

const ALL_THEMES = [...FREE_THEMES, ...PREMIUM_THEMES];

/** Center-x offset (content-local, including left padding) of every card,
 *  plus the side padding needed so the first/last card can reach the
 *  viewport's center. The divider is a real flex child (same `gap` on
 *  both sides as a card), so its width is folded into the running cursor
 *  without needing its own entry in the returned card centers. */
function buildLayout(viewportWidth: number) {
	const sidePadding = Math.max((viewportWidth - CARD_WIDTH) / 2, 0);
	const widths = [
		...FREE_THEMES.map(() => CARD_WIDTH),
		DIVIDER_WIDTH,
		...PREMIUM_THEMES.map(() => CARD_WIDTH),
	];
	const centers: number[] = [];
	let cursor = 0;
	widths.forEach((w, i) => {
		if (i > 0) {
			cursor += CARD_GAP;
		}
		centers.push(cursor + w / 2);
		cursor += w;
	});
	const cardCenters = [
		...centers.slice(0, FREE_THEMES.length),
		...centers.slice(FREE_THEMES.length + 1),
	].map((c) => c + sidePadding);
	return { cardCenters, sidePadding };
}

type Props = {
	activeThemeId: string;
	isPlus: boolean;
	reducedMotion: boolean;
	onFreeThemePress: (themeId: string) => void;
	onPremiumThemePress: (themeId: string, available: boolean) => void;
};

export const ThemeCarousel = ({
	activeThemeId,
	isPlus,
	reducedMotion,
	onFreeThemePress,
	onPremiumThemePress,
}: Props) => {
	const { width: windowWidth } = useWindowDimensions();
	const viewportWidth = windowWidth - SECTION_INSET * 2;
	const { sidePadding, cardCenters } = useMemo(
		() => buildLayout(viewportWidth),
		[viewportWidth]
	);

	const initialIndex = getInitialThemeCarouselIndex(ALL_THEMES, activeThemeId);
	const initialScrollX = Math.max(
		cardCenters[initialIndex] - viewportWidth / 2,
		0
	);
	const snapOffsets = cardCenters.map((c) =>
		Math.max(c - viewportWidth / 2, 0)
	);

	// Seeded with initialScrollX (not 0): the ScrollView starts at that offset
	// via `contentOffset` below, but RN doesn't fire onScroll for a prop-driven
	// initial position — an unseeded shared value would leave every card's
	// scale/opacity and the glow color computed as if scrolled to the start.
	const scrollX = useSharedValue(initialScrollX);
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (event) => {
			scrollX.set(event.contentOffset.x);
		},
	});

	// contentOffset only applies on mount, so a viewport change (Android
	// split-screen resize, iPad multitasking) recomputes cardCenters/
	// initialScrollX above but leaves the native scroll position and scrollX
	// pointing at the old, now-mismatched offset. Re-sync both when the
	// viewport actually changes; skip the mount run since contentOffset
	// already placed it there.
	const lastViewportWidth = useRef(viewportWidth);
	useEffect(() => {
		if (lastViewportWidth.current === viewportWidth) {
			return;
		}
		lastViewportWidth.current = viewportWidth;
		scrollX.set(initialScrollX);
		scrollTo(scrollRef, initialScrollX, 0, false);
	}, [viewportWidth, initialScrollX, scrollRef, scrollX]);

	return (
		<View className="mx-5 overflow-hidden rounded-3xl bg-surface/30">
			{!reducedMotion &&
				ALL_THEMES.map((theme, i) => (
					<ThemeCarouselGlow
						center={cardCenters[i]}
						key={theme.id}
						nextCenter={cardCenters[i + 1]}
						prevCenter={cardCenters[i - 1]}
						scrollX={scrollX}
						theme={theme}
						viewportWidth={viewportWidth}
					/>
				))}
			<Animated.ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingHorizontal: sidePadding },
				]}
				contentOffset={{ x: initialScrollX, y: 0 }}
				decelerationRate="fast"
				horizontal
				onScroll={scrollHandler}
				ref={scrollRef}
				scrollEventThrottle={16}
				showsHorizontalScrollIndicator={false}
				snapToOffsets={snapOffsets}
			>
				{FREE_THEMES.map((theme, i) => (
					<ThemeCarouselItem
						center={cardCenters[i]}
						key={theme.id}
						reducedMotion={reducedMotion}
						scrollX={scrollX}
						viewportWidth={viewportWidth}
					>
						<ThemePreviewCard
							isActive={activeThemeId === theme.id}
							onPress={() => onFreeThemePress(theme.id)}
							theme={theme}
							width={CARD_WIDTH}
						/>
					</ThemeCarouselItem>
				))}

				<View style={styles.divider}>
					<View className="h-32 w-px bg-foreground/10" />
				</View>

				{PREMIUM_THEMES.map((theme, i) => {
					const index = FREE_THEMES.length + i;
					return (
						<ThemeCarouselItem
							center={cardCenters[index]}
							key={theme.id}
							reducedMotion={reducedMotion}
							scrollX={scrollX}
							viewportWidth={viewportWidth}
						>
							<ThemePreviewCard
								isActive={activeThemeId === theme.id}
								isLocked={!isPlus || theme.available === false}
								onPress={() =>
									onPremiumThemePress(theme.id, theme.available !== false)
								}
								theme={theme}
								width={CARD_WIDTH}
							/>
						</ThemeCarouselItem>
					);
				})}
			</Animated.ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	content: { alignItems: "center", gap: CARD_GAP, paddingVertical: 20 },
	divider: {
		alignItems: "center",
		justifyContent: "center",
		width: DIVIDER_WIDTH,
	},
});
