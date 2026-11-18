import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { COPY } from "../copy";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";

/** Under the tiles, clear of the home indicator. */
const BOTTOM = 24;
const RISE = 8;
const IN_MS = 400;
/** After the three tiles have risen. */
const AFTER_TILES_MS = 800;

/**
 * Production's gave-up card, under Where next's tiles: left at the turn cap, Reflect asks once
 * what happened. One tap answers (`feedback.submit`, `gave_up`) and it goes.
 */
export function WhatHappened() {
	const { state, actions } = useReflect();
	const { reduced } = useReflectDraw();
	const { bottom } = useSafeAreaInsets();
	if (!state.whatHappened) {
		return null;
	}
	const copy = COPY.next.whatHappened;

	return (
		<Animated.View
			className="absolute inset-x-6 gap-2.5"
			entering={fadeUp(AFTER_TILES_MS, IN_MS, RISE, reduced)}
			style={{ bottom: bottom + BOTTOM }}
		>
			<AppText accessibilityRole="header" color="muted" variant="footnote">
				{copy.title}
			</AppText>
			<View className="flex-row flex-wrap gap-2">
				{copy.options.map((o) => (
					<PressScale
						accessibilityRole="button"
						className="h-8.5 justify-center rounded-full border border-separator bg-surface px-3.5"
						haptic={Presets.chirp}
						key={o.id}
						onPress={() => actions.answerWhatHappened(o.id)}
					>
						<AppText className="text-[14px]" variant="callout" weight="medium">
							{o.label}
						</AppText>
					</PressScale>
				))}
			</View>
		</Animated.View>
	);
}
