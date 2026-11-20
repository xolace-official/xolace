import { Link, Stack, useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, View } from "react-native";
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

const NAV_BAR = 44;
const IOS = Platform.OS === "ios";
const GONE_GAP = 48;

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
	const underBar = IOS;
	const onCover = underBar && hub !== null && !folded;

	return (
		<>
			<Stack.Screen
				options={{
					...header,
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
						style={{
							paddingTop: underBar ? insets.top + NAV_BAR + GONE_GAP : GONE_GAP,
						}}
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
			{underBar ? (
				<FoldedEdge barBottom={insets.top + NAV_BAR} on={folded} />
			) : null}
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
