import { useEffect } from "react";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
	cancelAnimation,
	type SharedValue,
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
import {
	afterRelease,
	dragPhase,
	dragReach,
	type MicPhase,
	type MicReach,
	type MicRelease,
	NO_REACH,
	releaseOf,
} from "./mic-gesture";
import { MicGlow, MicRing } from "./mic-glow";
import { HELD, POWER } from "./mic-motion";

const HOLD_MS = 180;
const MIC = LAYOUT.bar.mic;
const ICON = 22;
const STOP_ICON = 18;
const MIC_ICON = { android: "mic", ios: "mic" } as const;
const STOP = { android: "stop", ios: "stop.fill" } as const;

type Props = {
	phase: MicPhase;
	onPhase: (phase: MicPhase) => void;
	onRelease: (kind: MicRelease) => void;
	/** Written as the finger moves, for the cancel and lock hints. */
	reach: SharedValue<MicReach>;
};

export function MicButton({ phase, onPhase, onRelease, reach }: Props) {
	const { state, actions } = useReflect();
	const { reduced } = useReflectDraw();
	const { listening } = state;
	const locked = phase === "locked";
	const ink = useTokenColor("foreground");

	const timer = useSharedValue(0);
	const at = useSharedValue<MicPhase>(phase);
	const held = useSharedValue(0);
	const power = useSharedValue(0);
	const glowX = useSharedValue(0);
	const stopShown = useSharedValue(0);

	useEffect(() => {
		if (phase === "idle" || phase === "locked") {
			at.set(phase);
		}
		stopShown.set(withTiming(phase === "locked" ? 1 : 0, HELD));
	}, [phase, at, stopShown]);

	useEffect(() => {
		power.set(withTiming(listening ? 1 : 0, POWER));
		held.set(withTiming(listening && !locked && !reduced ? 1 : 0, HELD));
	}, [listening, locked, reduced, power, held]);

	const pan = usePanGesture({
		minDistance: 0,
		onBegin: (e) => {
			glowX.set(e.x - MIC / 2);
			timer.set(0);
			if (at.get() === "locked") {
				return;
			}
			timer.set(
				withDelay(
					HOLD_MS,
					withTiming(1, { duration: 1, ...PLAY_AS_CHOSEN }, (done) => {
						if (!done) {
							return;
						}
						at.set("holding");
						if (!reduced) {
							held.set(withTiming(1, HELD));
						}
						power.set(withTiming(1, POWER));
						scheduleOnRN(onPhase, "holding");
						scheduleOnRN(actions.startSpeaking);
					})
				)
			);
		},
		onFinalize: () => {
			cancelAnimation(timer);
			const from = at.get();
			const next = afterRelease(from);
			at.set(next);
			scheduleOnRN(onRelease, releaseOf(from));
			reach.set(NO_REACH);
			held.set(withTiming(0, HELD));
			power.set(withTiming(next === "locked" ? 1 : 0, POWER));
		},
		onUpdate: (e) => {
			const x = Math.max(-MIC / 2, Math.min(MIC / 2, e.x - MIC / 2));
			glowX.set(withSpring(x, { ...SPEAK.glowSpring, ...PLAY_AS_CHOSEN }));
			const from = at.get();
			if (from !== "idle" && from !== "locked") {
				reach.set(dragReach(e.translationX, e.translationY));
			}
			const next = dragPhase(from, e.translationX, e.translationY);
			if (next !== from) {
				at.set(next);
				scheduleOnRN(onPhase, next);
			}
		},
	});

	const micStyle = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + (SPEAK.heldScale - 1) * held.get() }],
	}));
	const micIconStyle = useAnimatedStyle(() => ({
		opacity: 1 - stopShown.get(),
	}));
	const stopIconStyle = useAnimatedStyle(() => ({ opacity: stopShown.get() }));

	return (
		<GestureDetector gesture={pan}>
			<Animated.View
				accessibilityActions={[{ name: "activate" }]}
				accessibilityHint={locked ? COPY.write.stopHint : COPY.write.speakHint}
				accessibilityLabel={
					locked ? COPY.write.stopLabel : COPY.write.speakLabel
				}
				accessibilityRole="button"
				accessibilityState={{ busy: listening }}
				accessible
				onAccessibilityAction={() => {
					if (locked) {
						onRelease("stop");
					} else if (listening) {
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
					<Animated.View className="absolute" style={micIconStyle}>
						<Icon color={ink} name={MIC_ICON} size={ICON} />
					</Animated.View>
					<Animated.View className="absolute" style={stopIconStyle}>
						<Icon color={ink} name={STOP} size={STOP_ICON} />
					</Animated.View>
				</Animated.View>
			</Animated.View>
		</GestureDetector>
	);
}
