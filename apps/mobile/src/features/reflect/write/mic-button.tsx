import { useEffect } from "react";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
	cancelAnimation,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Icon } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { SPEAK } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { MicGlow, MicRing } from "./mic-glow";
import { HELD, POWER } from "./mic-motion";

const HOLD_MS = 180;
const ARM_AT = -40;
const DISARM_AT = -28;
const MIC = LAYOUT.bar.mic;
const ICON = 22;
const MIC_ICON = { android: "mic", ios: "mic" } as const;

type Props = {
	onTap: () => void;
	onArmed: (armed: boolean) => void;
};

export function MicButton({ onTap, onArmed }: Props) {
	const { state, actions } = useReflect();
	const { reduced } = useReflectDraw();
	const { listening } = state;
	const ink = useTokenColor("foreground");

	const timer = useSharedValue(0);
	const holding = useSharedValue(0);
	const armed = useSharedValue(0);
	const held = useSharedValue(0);
	const power = useSharedValue(0);
	const glowX = useSharedValue(0);

	useEffect(() => {
		power.set(withTiming(listening ? 1 : 0, POWER));
		held.set(withTiming(listening && !reduced ? 1 : 0, HELD));
	}, [listening, reduced, power, held]);

	const stop = (keep: boolean) => {
		onArmed(false);
		if (keep) {
			actions.stopSpeaking();
		} else {
			actions.cancelSpeaking();
		}
	};

	const pan = usePanGesture({
		minDistance: 0,
		onBegin: (e) => {
			glowX.set(e.x - MIC / 2);
			timer.set(0);
			timer.set(
				withDelay(
					HOLD_MS,
					withTiming(1, { duration: 1, ...PLAY_AS_CHOSEN }, (done) => {
						if (!done) {
							return;
						}
						holding.set(1);
						if (!reduced) {
							held.set(withTiming(1, HELD));
						}
						power.set(withTiming(1, POWER));
						scheduleOnRN(actions.startSpeaking);
					})
				)
			);
		},
		onFinalize: () => {
			cancelAnimation(timer);
			if (holding.get() === 1) {
				scheduleOnRN(stop, armed.get() !== 1);
			} else {
				scheduleOnRN(onTap);
			}
			holding.set(0);
			armed.set(0);
			held.set(withTiming(0, HELD));
			power.set(withTiming(0, POWER));
		},
		onUpdate: (e) => {
			const x = Math.max(-MIC / 2, Math.min(MIC / 2, e.x - MIC / 2));
			glowX.set(withSpring(x, { ...SPEAK.glowSpring, ...PLAY_AS_CHOSEN }));
			if (holding.get() !== 1) {
				return;
			}
			if (armed.get() === 0 && e.translationY < ARM_AT) {
				armed.set(1);
				scheduleOnRN(onArmed, true);
			} else if (armed.get() === 1 && e.translationY > DISARM_AT) {
				armed.set(0);
				scheduleOnRN(onArmed, false);
			}
		},
	});

	const micStyle = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + (SPEAK.heldScale - 1) * held.get() }],
	}));

	return (
		<GestureDetector gesture={pan}>
			<Animated.View
				accessibilityActions={[{ name: "activate" }]}
				accessibilityHint={COPY.write.speakHint}
				accessibilityLabel={COPY.write.speakLabel}
				accessibilityRole="button"
				accessibilityState={{ busy: listening }}
				accessible
				onAccessibilityAction={() => {
					if (listening) {
						actions.stopSpeaking();
					} else {
						actions.startSpeaking();
					}
				}}
				style={[{ height: MIC, width: MIC }, micStyle]}
			>
				<MicGlow power={power} x={glowX} />
				<MicRing />
				<Animated.View className="flex-1 items-center justify-center rounded-full border border-separator bg-surface">
					<Icon color={ink} name={MIC_ICON} size={ICON} />
				</Animated.View>
			</Animated.View>
		</GestureDetector>
	);
}
