import { Link, Stack, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { useScheme } from "@/design/scheme";
import { COPY } from "@/features/lantern/copy";
import { BarTitle } from "@/features/lantern/hub/bar-title";
import { FoldedEdge } from "@/features/lantern/hub/folded-edge";
import { useHubScreen } from "@/features/lantern/hub/hub-data";
import { HubHeader } from "@/features/lantern/hub/hub-header";
import { ListenCard } from "@/features/lantern/hub/listen-card";
import { LS } from "@/features/lantern/lantern-style";
import { EntryRow } from "@/features/lantern/lists/entry-row";
import { RowsSkeleton } from "@/features/lantern/lists/rows-skeleton";
import { useHeaderOptions } from "@/lib/header-options";
import { useTokenColors } from "@/lib/use-token-color";

/** The bar's height below the safe area: a hub measures its fold from it (Explore's topic). */
const NAV_BAR = 44;
const GONE_GAP = 48;

/**
 * A hub (handoff §3.2): its cover full width under a transparent bar, the title, the intro and the
 * count ("· 2 read" is new), then the items in the editor's order, numbered, a listen too. The
 * name moves into the bar once the title scrolls under it, as a topic's does.
 */
export function HubScreen() {
	const { state, actions } = useHubScreen();
	const insets = useSafeAreaInsets();
	const focused = useIsFocused();
	const dark = useScheme() === "dark";
	const header = useHeaderOptions("small");
	const [foreground, coverInk] = useTokenColors(["foreground", "cover-ink"]);
	const [folded, setFolded] = useState(false);
	const y = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		y.set(e.contentOffset.y);
	});
	useAnimatedReaction(
		() => y.get() > LS.hubFold,
		(now, prev) => {
			if (now !== prev) {
				scheduleOnRN(setFolded, now);
			}
		}
	);
	const hub = state.hub;
	// On the cover: white ink. Folded, or with no cover to sit on, the page's.
	const onCover = hub !== null && !folded;

	return (
		<>
			<Stack.Screen
				options={{
					...header,
					// The cover runs under the bar with its own band: no soft edge, no blur.
					headerBlurEffect: undefined,
					headerTintColor: onCover ? coverInk : foreground,
					headerTitle: () => <BarTitle on={folded} text={hub?.title ?? ""} />,
					scrollEdgeEffects: { top: "hidden" },
				}}
			/>
			{focused ? (
				<StatusBar style={onCover || dark ? "light" : "dark"} />
			) : null}
			<Animated.ScrollView
				className="bg-background"
				// The cover runs under the bar: offset 0 is the top of the screen.
				contentContainerStyle={{ paddingBottom: LS.bottom }}
				contentInsetAdjustmentBehavior="never"
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				{hub === null ? null : <HubHeader hub={hub} />}
				{hub === undefined ? <RowsSkeleton count={4} /> : null}
				{hub === null ? (
					<AppText
						center
						className="px-8 text-[15px]"
						color="muted"
						// No cover: clear the bar the cover would have run under.
						style={{ paddingTop: insets.top + NAV_BAR + GONE_GAP }}
						variant="callout"
					>
						{COPY.lists.hubGone}
					</AppText>
				) : null}
				<View className="pt-1">
					{hub?.items.map((item, i) =>
						item.kind === "entry" ? (
							<EntryRow
								actions={actions}
								entry={item.entry}
								from="hub"
								hub={hub.slug}
								index={i}
								key={item.entry._id}
							/>
						) : (
							<ListenCard index={i} key={item.track._id} track={item.track} />
						)
					)}
				</View>
			</Animated.ScrollView>
			<FoldedEdge barBottom={insets.top + NAV_BAR} on={folded} />
			{/* The cover's resting frame: what a hub card zooms into. */}
			<Link.AppleZoomTarget>
				<View
					className="absolute inset-x-0 top-0"
					pointerEvents="none"
					style={{ height: LS.hubCover }}
				/>
			</Link.AppleZoomTarget>
		</>
	);
}
