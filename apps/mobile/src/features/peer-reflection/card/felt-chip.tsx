import { useEffect } from "react";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import { COPY } from "../copy";
import type { PeersColors } from "../peers-colors";
import { CHIP, LAYOUT } from "../peers-look";
import { EmberGlyph } from "./ember-glyph";
import { FeltLabel } from "./felt-label";

const L = LAYOUT.chip;

type Props = {
	on: boolean;
	/** Bumped on every turn-on, so the ember beats once per press. */
	presses: number;
	others: number;
	reduced: boolean;
	colors: PeersColors;
	/** The chip's row fades in after the words (board `.row`). */
	rowOpacity: SharedValue<number>;
	onPress: () => void;
};

/**
 * "I've felt this too" (board `.chip`): a small round ember instead of
 * production's heart. On, the chip warms (.45 s), the ember fills and beats, and
 * the label rises to "You and 12 others". One button for VoiceOver, its state
 * selected and its value the count.
 */
export function FeltChip({
	on,
	presses,
	others,
	reduced,
	colors,
	rowOpacity,
	onPress,
}: Props) {
	const [bg, edge, shadow] = colors.chip;
	const k = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		k.set(
			withTiming(on ? 1 : 0, {
				duration: reduced ? REDUCED_FADE_MS : CHIP.ms,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [on, reduced, k]);
	const row = useAnimatedStyle(() => ({ opacity: rowOpacity.get() }));
	const lit = useAnimatedStyle(() => ({ opacity: clamp01(k.get()) }));

	return (
		<Animated.View
			className="flex-row justify-end"
			style={[{ marginTop: L.top }, row]}
		>
			<PressScale
				accessibilityLabel={COPY.felt}
				accessibilityRole="button"
				accessibilityState={{ selected: on }}
				accessibilityValue={on ? { text: COPY.you(others) } : undefined}
				className="flex-row items-center border-continuous bg-surface-secondary"
				hitSlop={4}
				onPress={onPress}
				style={{
					borderRadius: L.height / 2,
					gap: L.gap,
					minHeight: L.height,
					paddingLeft: L.padLeft,
					paddingRight: L.padRight,
				}}
			>
				<Animated.View
					className="absolute inset-0"
					pointerEvents="none"
					style={[
						{
							backgroundColor: bg,
							borderRadius: L.height / 2,
							boxShadow: `inset 0 0 0 0.5px ${edge}, 0 6px 16px -10px ${shadow}`,
						},
						lit,
					]}
				/>
				<EmberGlyph
					colors={colors}
					lit={k}
					on={on}
					presses={presses}
					reduced={reduced}
				/>
				<FeltLabel on={on} others={others} reduced={reduced} />
			</PressScale>
		</Animated.View>
	);
}
