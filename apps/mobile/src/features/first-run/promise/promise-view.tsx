import { Asset } from "expo-asset";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { LinearGradient } from "@/components/shared/styled";
import { playGentlePresence, playOnboardingEntrance } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { nextNow, type Stage } from "../first-run-motion";
import { PROMISE_COLORS } from "../first-run-palette";
import type { FirstRunFaces } from "../skia-words";
import { MoodBelt } from "./mood-belt";
import { cardWidth } from "./mood-card";
import { PromiseButton } from "./promise-button";
import { PromiseFire, PromiseUnderglow } from "./promise-fire";
import {
	ageT,
	darkOf,
	FIRE,
	freshEng,
	OPEN,
	promiseSettled,
	step,
	X,
} from "./promise-scene";
import { PromiseWords } from "./promise-words";
import { WORDS_BOX } from "./promise-words-layout";
import { type PromiseScene, usePromiseScene } from "./use-promise-scene";

const PREFETCH = [
	require("@/assets/images/flux/flux-campfire.png"),
	require("@/assets/images/flux/mirror-v2-bg.png"),
	require("@/assets/images/flux/vent-bg.png"),
	require("@/assets/images/flux/flux-campfire-loop.webp"),
	require("@/assets/images/flux/flux-campfire-still.webp"),
];
const PREFETCH_AFTER_MS = 400;
const SETTLE_MS = 450;

type Props = {
	stage: Stage;
	day: boolean;
	reduced: boolean;
	faces: FirstRunFaces;
	gate: SharedValue<number>;
	scene?: PromiseScene;
	onBegin: (toSeat: boolean) => void;
	onSwap: () => void;
};

const DRIFT_TOKENS = [
	"first-run-drift-1",
	"first-run-drift-2",
	"first-run-drift-3",
] as const;

export function PromiseView({
	stage,
	day,
	reduced,
	faces,
	gate,
	scene,
	onBegin,
	onSwap,
}: Props) {
	const cw = cardWidth(stage.W);
	const eng = useSharedValue(freshEng(cw, stage.W, reduced, scene?.at ?? -1));
	const drift = useTokenColors(DRIFT_TOKENS) as [string, string, ...string[]];
	const thud = () => Presets.thud();
	usePromiseScene(eng, scene);

	useEffect(() => {
		playOnboardingEntrance();
		const id = setTimeout(() => Asset.loadAsync(PREFETCH), PREFETCH_AFTER_MS);
		return () => clearTimeout(id);
	}, []);

	useFrameCallback((f) => {
		if (promiseSettled(eng.get())) {
			return;
		}
		let ev = 0;
		// A plain closure: it runs here on the UI thread, so `ev` comes back out.
		eng.modify((e) => {
			e.now = nextNow(e.now, f);
			if (e.t0 === 0) {
				e.t0 = e.now;
			}
			step(e, f.timeSincePreviousFrame ?? 16);
			if (e.tx >= 0 && e.xHold < 0) {
				const x = e.now - e.tx;
				if (!(e.rm || e.fired & FIRE.catch) && x >= X.catch) {
					e.fired |= FIRE.catch;
					ev |= FIRE.catch;
				}
				if (!(e.fired & FIRE.swap) && x >= (e.rm ? X.swapRm : X.swap)) {
					e.fired |= FIRE.swap;
					ev |= FIRE.swap;
					gate.set(1);
				}
			}
			return e;
		});
		if (ev & FIRE.catch) {
			scheduleOnRN(thud);
		}
		if (ev & FIRE.swap) {
			scheduleOnRN(onSwap);
		}
	});

	const go = (toSeat: boolean) => {
		if (eng.get().tx >= 0) {
			return;
		}
		playGentlePresence();
		onBegin(toSeat);
		eng.modify((e) => {
			"worklet";
			e.tx = e.now;
			e.acct = toSeat;
			e.down = false;
			return e;
		});
	};
	const settle = () =>
		eng.modify((e) => {
			"worklet";
			if (e.tx < 0 && e.hold < 0 && ageT(e) < OPEN.cta + SETTLE_MS) {
				e.t0 = e.now - (OPEN.cta + SETTLE_MS);
			}
			return e;
		});

	const from = day ? PROMISE_COLORS.ground.day : PROMISE_COLORS.ground.dusk;
	const to = PROMISE_COLORS.ground.night;
	const ground = useAnimatedStyle(() => {
		const k = darkOf(eng.get());
		const c = from.map((v, i) => Math.round(v + (to[i] - v) * k));
		return { backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` };
	});

	return (
		<Animated.View className="absolute inset-0" style={ground}>
			<StatusBar hidden />
			<LinearGradient
				className="absolute inset-0"
				colors={drift}
				end={{ x: 1, y: 0.5 }}
				pointerEvents="none"
				start={{ x: 0, y: 0.5 }}
			/>
			<PromiseUnderglow day={day} eng={eng} stage={stage} />
			<MoodBelt eng={eng} stage={stage} />
			<PromiseWords day={day} eng={eng} faces={faces} stage={stage} />
			<Pressable
				accessible={false}
				className="absolute"
				onPress={settle}
				style={{
					height: WORDS_BOX.height,
					left: WORDS_BOX.left,
					right: WORDS_BOX.left,
					top: WORDS_BOX.top + stage.dy,
				}}
			/>
			<PromiseButton day={day} eng={eng} onGo={go} stage={stage} />
			<PromiseFire eng={eng} stage={stage} />
		</Animated.View>
	);
}
