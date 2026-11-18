import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedRef,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useBadgesScreen } from "@/features/achievements/badges/badges-data";
import { BadgeHeld } from "@/features/achievements/badges/held/badge-held";
import {
	type OpenOpts,
	openBadge,
	resetHeld,
	useHeld,
} from "@/features/achievements/badges/held-store";
import { BadgesBar } from "@/features/achievements/badges/list/badges-bar";
import { BadgesList } from "@/features/achievements/badges/list/badges-list";
import { type Pose, REST_POSE } from "@/features/achievements/coin/pose";

/** The list sinks to .94 behind a held badge. */
const RECEDE = 0.06;
/** A deep link (`/achievements?open=streak-10`) opens once the screen has settled in. */
const DEEP_LINK_MS = 450;

/** What to open on arrival: a deep link's badge, or a dev state's held frame. */
export type OpenOnArrival = { id: string; opts?: OpenOpts; afterMs?: number };

/**
 * Achievements (badges §2): production's screen, kept as it is, and a badge
 * page that opens in place over it: the badge flies out of its slot and can be
 * held, turned and put back.
 */
export function BadgesScreen({ open }: { open?: OpenOnArrival }) {
	const { state, actions } = useBadgesScreen();
	const window = useWindowDimensions();
	const out = useHeld((s) => s.out);
	const pose = useSharedValue<Pose>(REST_POSE);
	const scroll = useAnimatedRef<Animated.ScrollView>();
	const y = useSharedValue(0);
	const loaded = state.view !== undefined;
	const known = open ? state.view?.byId.has(open.id) : undefined;

	// A visit starts and ends with nothing out, even with another copy of the
	// screen under this one (a link opened over it): the store is module-wide.
	useEffect(() => {
		resetHeld();
		return resetHeld;
	}, []);

	useEffect(() => {
		if (!(open && loaded)) {
			return;
		}
		if (!known) {
			actions.missing();
			return;
		}
		const id = setTimeout(
			() => openBadge(open.id, window, { below: true, ...open.opts }),
			open.afterMs ?? DEEP_LINK_MS
		);
		return () => clearTimeout(id);
		// One open per link (its id), once the overview is in.
	}, [open?.id, loaded, known]);

	// A badge cleared without seating (the screen reset) leaves the list at rest.
	useEffect(() => {
		if (!out) {
			pose.set(REST_POSE);
		}
	}, [out, pose]);

	const list = useAnimatedStyle(() => {
		const r = pose.get().recede;
		return { transform: r ? [{ scale: 1 - RECEDE * r }] : [] };
	});
	const scrim = useAnimatedStyle(() => ({ opacity: pose.get().dim }));

	return (
		<View className="flex-1 bg-background">
			{/* While a badge is out, an edge swipe puts it back instead of leaving. */}
			<Stack.Screen options={{ gestureEnabled: !out }} />
			<Animated.View
				accessibilityElementsHidden={out !== null}
				className="flex-1"
				importantForAccessibility={out ? "no-hide-descendants" : "auto"}
				style={[{ transformOrigin: "50% 45%" }, list]}
			>
				<BadgesList scroll={scroll} y={y} />
			</Animated.View>
			<Animated.View
				className="absolute inset-0 bg-background"
				pointerEvents="none"
				style={scrim}
			/>
			<BadgesBar hidden={out !== null} y={y} />
			<BadgeHeld pose={pose} />
		</View>
	);
}
