import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { IdleMenu } from "@/features/idle-menu/menu";
import { ComposeChrome } from "@/features/reflect/compose/compose-chrome";
import {
	ComposeSlot,
	SLOT_BAND_GAP,
	SLOT_H,
} from "@/features/reflect/compose/compose-slot";
import { useMorphGeometry } from "@/features/reflect/compose/morph-geometry";
import { TalkTourStep } from "@/features/reflect/compose/talk-tour-step";
import { TextureBand } from "@/features/reflect/compose/texture-band";
import type { ReflectionAction } from "@/features/reflect/types";
import { a11yHidden } from "@/lib/utils";

type Props = {
	progress: SharedValue<number>;
	/** The reduced-motion cross-fade's opacity. 1 whenever motion is allowed. */
	fade: SharedValue<number>;
	expanded: boolean;
	reduceMotion: boolean;
	isNight: boolean;
	eventPrompt: string | null;
	eventLabel: string | null;
	spaceName?: string;
	selectedTextures: string[];
	dispatch: React.Dispatch<ReflectionAction>;
	onScaffoldSubmit: () => void;
	onVoiceTap: () => void;
	isRecording: boolean;
};

/**
 * The page the card rests on; recedes as the card expands. `fade` covers reduced motion.
 */
export const ComposeSurround = ({
	progress,
	fade,
	expanded,
	reduceMotion,
	isNight,
	eventPrompt,
	eventLabel,
	spaceName,
	selectedTextures,
	dispatch,
	onScaffoldSubmit,
	onVoiceTap,
	isRecording,
}: Props) => {
	const geo = useMorphGeometry();
	const rawHeaderHeight = useHeaderHeight();
	// Freeze the last known header height so it doesn't jump when the header
	// hides for the composer.
	const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
	if (rawHeaderHeight > 0 && rawHeaderHeight !== stableHeaderHeight) {
		setStableHeaderHeight(rawHeaderHeight);
	}

	const recede = useAnimatedStyle(() => ({
		opacity:
			fade.get() *
			interpolate(progress.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP),
	}));

	const bandStyle = useAnimatedStyle(() => ({
		opacity:
			fade.get() *
			interpolate(progress.get(), [0, 0.5], [1, 0], Extrapolation.CLAMP),
		transform: [
			{
				translateY: reduceMotion
					? 0
					: interpolate(progress.get(), [0, 0.6], [0, 40], Extrapolation.CLAMP),
			},
		],
	}));

	const inFlow = expanded ? "none" : "auto";
	const overlay = expanded ? "none" : "box-none";
	// A screen reader does not honour opacity 0: without this the band and a
	// second mic stay swipe-reachable behind the open composer.
	const receded = a11yHidden(expanded);
	const chromeStyle = {
		paddingTop: Math.max(0, stableHeaderHeight - geo.insetTop),
	};

	// At large text sizes the band climbs into the slot under the card, so the
	// slot sits at the card's geometry or above the band's top, whichever is higher.
	const [bandTop, setBandTop] = useState(0);
	const restingTop = geo.restTop + geo.restH + 20;
	const micStyle = {
		top: bandTop
			? Math.min(restingTop, bandTop - SLOT_H - SLOT_BAND_GAP)
			: restingTop,
	};

	return (
		<>
			{/* Covers the header row, where the talk door sits. */}
			<TalkTourStep height={chromeStyle.paddingTop} />

			<Animated.View
				className="px-6 pt-4"
				pointerEvents={inFlow}
				style={[chromeStyle, recede]}
				{...receded}
			>
				<ComposeChrome
					eventLabel={eventLabel}
					eventPrompt={eventPrompt}
					spaceName={spaceName}
				/>
			</Animated.View>

			<View className="flex-1" />

			<Animated.View
				onLayout={(e) => setBandTop(e.nativeEvent.layout.y)}
				pointerEvents={inFlow}
				style={bandStyle}
				{...receded}
			>
				<TextureBand
					dispatch={dispatch}
					isNight={isNight}
					selectedTextures={selectedTextures}
				/>
			</Animated.View>

			<ComposeSlot
				expanded={expanded}
				hasSelection={selectedTextures.length > 0}
				isRecording={isRecording}
				onScaffoldSubmit={onScaffoldSubmit}
				onVoiceTap={onVoiceTap}
				style={[
					{ left: 0, position: "absolute", right: 0 },
					micStyle,
					bandStyle,
				]}
			/>

			<Animated.View
				pointerEvents={overlay}
				style={[StyleSheet.absoluteFill, recede]}
				{...receded}
			>
				<IdleMenu />
			</Animated.View>
		</>
	);
};
