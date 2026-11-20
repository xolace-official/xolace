import { Stack } from "expo-router";
import { useEffect, useEffectEvent } from "react";
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

const RECEDE = 0.06;
const DEEP_LINK_MS = 450;

export type OpenOnArrival = { id: string; opts?: OpenOpts; afterMs?: number };

export function BadgesScreen({ open }: { open?: OpenOnArrival }) {
	const { state, actions } = useBadgesScreen();
	const window = useWindowDimensions();
	const out = useHeld((s) => s.out);
	const pose = useSharedValue<Pose>(REST_POSE);
	const scroll = useAnimatedRef<Animated.ScrollView>();
	const y = useSharedValue(0);
	const loaded = state.view !== undefined;
	const known = open ? state.view?.byId.has(open.id) : undefined;

	useEffect(() => {
		resetHeld();
		return resetHeld;
	}, []);

	const openId = open?.id;
	const delay = open?.afterMs ?? DEEP_LINK_MS;
	const missing = useEffectEvent(() => actions.missing());
	const openNow = useEffectEvent(() => {
		if (open) {
			openBadge(open.id, window, { below: true, ...open.opts });
		}
	});
	// A deep link opens its badge once the list has loaded.
	useEffect(() => {
		if (!(openId && loaded)) {
			return;
		}
		if (!known) {
			missing();
			return;
		}
		const id = setTimeout(openNow, delay);
		return () => clearTimeout(id);
	}, [openId, loaded, known, delay]);

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
