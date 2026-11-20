import { type ReactNode, useRef } from "react";
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

export const QUOTE_TEXT = { fontSize: 15.5, lineHeight: 23.56 } as const;
const LABEL = { fontSize: 11, letterSpacing: 1.1 } as const;
const MAX_LINES = 4;
const LIFT_OFF_MS = 20;
const DEFAULT_DROP = 64;
const FROM_OPACITY = 0.4;

type Props = {
	lift?: boolean;
	at: { x: number; y: number };
	children?: ReactNode;
};

export function YourWords({ lift, at, children }: Props) {
	const { liftFrom, reduced } = useReflectDraw();
	const { state } = useReflect();
	const sent = state.yourWords.map(([t]) => t).join("");
	const laidOut = useRef(false);
	const flying = lift && !reduced;
	const p = useSharedValue(flying ? 0 : 1);
	const from = useSharedValue({ dx: 0, dy: DEFAULT_DROP });

	const liftOff = (textY: number) => {
		if (laidOut.current) {
			return;
		}
		laidOut.current = true;
		if (!flying) {
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
	};

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
				onLayout={(e) => liftOff(e.nativeEvent.layout.y)}
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
