import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	interpolateColor,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { EASE, LAYOUT, REDUCED_MS, T1, T2 } from "../session-look";
import { appear, clamp01 } from "../timeline";

const C = LAYOUT.cta;
/** `.cta`'s background and colour change over .3 s. */
const FILL = { duration: 300, ...PLAY_AS_CHOSEN };
const LABEL_MAX = 1.4;
const LABELS = [COPY.skip, COPY.continue, COPY.done] as const;

type Props = {
	/** 0 Skip for now, 1 Continue, 2 I'm done for now. */
	label: 0 | 1 | 2;
	c1: SharedValue<number>;
	c2: SharedValue<number>;
	reduced: boolean;
	onPress: () => void;
	onAnother: () => void;
};

/**
 * The pinned buttons (board `.cta`, `.cta2`): one 56 pt pill. Before an answer
 * it's "Skip for now" on the well; answered (or late) "Continue" in ink; in
 * moment 2 it slides from 34 up to 84 (.45 s, the sheet curve) as "I'm done for
 * now", and "Start another" fades in under it. The labels cross-roll.
 */
export function SessionFooter({
	label,
	c1,
	c2,
	reduced,
	onPress,
	onAnother,
}: Props) {
	const well = useTokenColor("surface-secondary");
	const ink = useTokenColor("foreground");
	// Taps and VoiceOver reach the button only once it has started to appear.
	const [shown, setShown] = useState(false);
	useAnimatedReaction(
		() => c2.get() >= 0 || c1.get() >= T1.cta.at,
		(on, was) => {
			if (on && !was) {
				scheduleOnRN(setShown, true);
			}
		}
	);
	const filled = useSharedValue(label === 0 ? 0 : 1);
	useEffect(() => {
		filled.set(withTiming(label === 0 ? 0 : 1, FILL));
	}, [label, filled]);

	const wrap = useAnimatedStyle(() => {
		const m2 = c2.get();
		let up = 0;
		if (m2 >= 0) {
			up = reduced ? 1 : EASE.sheetFn(clamp01(m2 / T2.cta.ms));
		}
		return {
			opacity:
				m2 >= 0 ? 1 : appear(c1.get(), T1.cta.at, T1.cta.ms, reduced).opacity,
			transform: [{ translateY: -(C.bottom2 - C.bottom) * up }],
		};
	});
	const fill = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(filled.get(), [0, 1], [well, ink]),
	}));
	const another = useAnimatedStyle(() => {
		const m2 = c2.get();
		const ms = reduced ? REDUCED_MS : T2.another.ms;
		return {
			opacity: m2 < 0 ? 0 : appear(m2, T2.another.at, ms, reduced).opacity,
		};
	});
	const anotherOn = label === 2;

	return (
		<>
			<Animated.View
				accessibilityElementsHidden={!shown}
				className="absolute z-21"
				importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
				pointerEvents={shown ? "auto" : "none"}
				style={[{ bottom: C.bottom, left: C.side, right: C.side }, wrap]}
			>
				<PressScale
					accessibilityLabel={LABELS[label]}
					className="rounded-full"
					onPress={onPress}
				>
					<Animated.View
						className="items-center justify-center overflow-hidden rounded-full"
						style={[{ minHeight: C.height }, fill]}
					>
						{LABELS.map((text, i) => (
							<Label
								first={i === 0}
								key={text}
								on={i === label}
								onInk={i > 0}
								text={text}
							/>
						))}
					</Animated.View>
				</PressScale>
			</Animated.View>
			<Animated.View
				accessibilityElementsHidden={!anotherOn}
				className="absolute z-21"
				importantForAccessibility={anotherOn ? "auto" : "no-hide-descendants"}
				pointerEvents={anotherOn ? "auto" : "none"}
				style={[{ bottom: C.bottom, left: C.side, right: C.side }, another]}
			>
				<PressScale
					accessibilityLabel={COPY.another}
					className="items-center justify-center"
					onPress={onAnother}
					style={{ minHeight: C.another }}
				>
					<AppText
						color="accentInk"
						maxFontSizeMultiplier={LABEL_MAX}
						style={{ fontSize: C.anotherSize }}
						variant="callout"
						weight="semibold"
					>
						{COPY.another}
					</AppText>
				</PressScale>
			</Animated.View>
		</>
	);
}

type LabelProps = { text: string; on: boolean; first: boolean; onInk: boolean };

/** `.cta span`: the shown label at rest; the others 8 pt below and clear (.25 s opacity, .3 s move). */
function Label({ text, on, first, onInk }: LabelProps) {
	const k = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		k.set(
			withTiming(on ? 1 : 0, {
				duration: T2.label.move,
				easing: EASE.label,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [on, k]);
	const style = useAnimatedStyle(() => ({
		opacity: clamp01(k.get() * (T2.label.move / T2.label.fade)),
		transform: [{ translateY: C.cross * (1 - k.get()) }],
	}));
	return (
		<View className={first ? undefined : "absolute"} pointerEvents="none">
			<Animated.View style={style}>
				<AppText
					color={onInk ? "background" : "foreground"}
					maxFontSizeMultiplier={LABEL_MAX}
					style={{ fontSize: C.size }}
					variant="body"
					weight="semibold"
				>
					{text}
				</AppText>
			</Animated.View>
		</View>
	);
}
