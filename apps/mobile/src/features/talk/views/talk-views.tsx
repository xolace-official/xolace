// A talk's two views, switched by a native segmented control under the header.
// Conversation is the transcript; Companion is the companion large. Both stay mounted (the
// transcript keeps its scroll) and cross-fade; the hidden face's clock stops. The chosen
// view is kept for every talk.

import { useHeaderHeight } from "expo-router/react-navigation";
import { type ReactNode, useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { Talk } from "@/features/talk/use-talk";
import { useTalkStyle } from "@/features/talk/use-talk-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { CompanionStage } from "./companion-stage";
import { TalkViewSwitch } from "./talk-view-switch";

const FADE_MS = 260;
const STAGE_FROM_SCALE = 0.96;
const SWITCH_GAP = 4;

type Props = {
	talk: Talk;
	/** The transcript, laid out to leave room for the switch. */
	conversation: ReactNode;
	/** `false` while the talk is out of sight: the stage's face stops too. */
	running: boolean;
};

export function TalkViews({ talk, conversation, running }: Props) {
	const { view, setView } = useTalkStyle();
	const reduced = useEffectiveReducedMotion();
	const headerHeight = useHeaderHeight();
	const onStage = view === "companion";
	const shown = useSharedValue(onStage ? 1 : 0);

	useEffect(() => {
		shown.set(withTiming(onStage ? 1 : 0, { duration: reduced ? 0 : FADE_MS }));
	}, [onStage, reduced, shown]);

	const listStyle = useAnimatedStyle(() => ({ opacity: 1 - shown.get() }));
	const stageStyle = useAnimatedStyle(() => ({
		opacity: shown.get(),
		transform: [
			{ scale: STAGE_FROM_SCALE + (1 - STAGE_FROM_SCALE) * shown.get() },
		],
	}));
	// iOS lays the switch under its transparent header; Android's header is solid.
	const switchTop = (Platform.OS === "ios" ? headerHeight : 0) + SWITCH_GAP;

	return (
		<View className="flex-1">
			<Animated.View
				accessibilityElementsHidden={onStage}
				importantForAccessibility={onStage ? "no-hide-descendants" : "auto"}
				pointerEvents={onStage ? "none" : "auto"}
				style={[StyleSheet.absoluteFill, listStyle]}
			>
				{conversation}
			</Animated.View>
			<Animated.View
				accessibilityElementsHidden={!onStage}
				importantForAccessibility={onStage ? "auto" : "no-hide-descendants"}
				pointerEvents={onStage ? "box-none" : "none"}
				style={[StyleSheet.absoluteFill, stageStyle]}
			>
				<CompanionStage talk={talk} visible={onStage && running} />
			</Animated.View>
			<View
				className="absolute inset-x-0 items-center"
				pointerEvents="box-none"
				style={{ top: switchTop }}
			>
				<TalkViewSwitch onChange={setView} view={view} />
			</View>
		</View>
	);
}
