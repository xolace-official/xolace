import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "./copy";
import { FLY } from "./motion";
import { PickedChips } from "./picked-chips";
import { useReflect } from "./reflect-data";
import { useReflectDraw } from "./reflect-draw";

/** Board `.qlab` and `.qtext`. */
export const QUOTE_TEXT = { fontSize: 15.5, lineHeight: 23.56 } as const;
const LABEL = { fontSize: 11, letterSpacing: 1.1 } as const;
const MAX_LINES = 4;
/** The block's LIFT_OFF: the flight starts .02 s after the send. */
const LIFT_OFF_MS = 20;
/** With nothing to lift from (a cold open), it rises from 64 pt below, as the board's `liftA`. */
const DEFAULT_DROP = 64;
/** Board `liftA`: it arrives from 40% opacity. */
const FROM_OPACITY = 0.4;

type Props = {
	/** The wait: the words lift out of the writing box and settle here (S1b). */
	lift?: boolean;
	/** Where this block sits on screen (its left and top), for the lift's start. */
	at: { x: number; y: number };
	/** The mirror: the text with its measured marker bands (S8). */
	children?: ReactNode;
};

/**
 * YOUR WORDS (board `.quote`): what you let out, kept at the top through the wait and under the
 * mirror, so the mirror is always read beside what you said.
 *
 * The lift is docking-prompt-card's flight (S1b): `p` springs 0 → 1 on 130/17, `lift = sin(πp)`;
 * the text travels from the writing box's origin to here, minus `lift·18`, and its scale is
 * (1.24 → 1)·(1 + .05·lift), the writing size settling into Your words.
 */
export function YourWords({ lift, at, children }: Props) {
	const { liftFrom, reduced } = useReflectDraw();
	const { state } = useReflect();
	const sent = state.yourWords.map(([t]) => t).join("");
	// The text's offset in this block, from layout (untransformed).
	const [textY, setTextY] = useState<number | null>(null);
	const flying = lift && !reduced;
	const p = useSharedValue(flying ? 0 : 1);
	const from = useSharedValue({ dx: 0, dy: DEFAULT_DROP });

	useEffect(() => {
		if (!flying || textY === null) {
			return;
		}
		const f = liftFrom.get();
		const y = at.y + textY;
		from.set(
			f.y > 0 ? { dx: f.x - at.x, dy: f.y - y } : { dx: 0, dy: DEFAULT_DROP }
		);
		p.set(
			withDelay(
				LIFT_OFF_MS,
				withSpring(1, { ...FLY.spring, ...PLAY_AS_CHOSEN })
			)
		);
	}, [flying, textY, liftFrom, from, p, at.x, at.y]);

	const fly = useAnimatedStyle(() => {
		const q = p.get();
		const arc = Math.sin(Math.PI * Math.min(1, Math.max(0, q)));
		const f = from.get();
		return {
			opacity: FROM_OPACITY + (1 - FROM_OPACITY) * Math.min(1, q),
			transform: [
				{ translateX: f.dx * (1 - q) },
				{ translateY: f.dy * (1 - q) - arc * FLY.arc },
				{
					scale:
						(FLY.fromScale + (1 - FLY.fromScale) * q) * (1 + FLY.swell * arc),
				},
			],
			transformOrigin: "0% 0%",
		};
	});
	const settle = useAnimatedStyle(() => ({
		opacity: FROM_OPACITY + (1 - FROM_OPACITY) * Math.min(1, p.get()),
	}));

	return (
		<View className="gap-2">
			<Animated.View className="gap-2" style={settle}>
				<AppText
					accessibilityRole="header"
					color="subtle"
					maxFontSizeMultiplier={1.4}
					style={LABEL}
					variant="caption"
					weight="bold"
				>
					{COPY.wait.yourWords}
				</AppText>
				<PickedChips words={state.sentPicks} />
			</Animated.View>
			<Animated.View
				onLayout={(e) => textY === null && setTextY(e.nativeEvent.layout.y)}
				style={fly}
			>
				{children ??
					(sent ? (
						<AppText
							color="muted"
							numberOfLines={MAX_LINES}
							style={QUOTE_TEXT}
							variant="callout"
						>
							{sent}
						</AppText>
					) : null)}
			</Animated.View>
		</View>
	);
}
