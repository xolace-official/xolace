import { type JSX, useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	ReduceMotion,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useClock, useLive } from "@/lib/motion/clock";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { AmbientLight } from "./chrome/ambient-light";
import { ReflectHeader } from "./chrome/reflect-header";
import { ReflectSky } from "./chrome/reflect-sky";
import { useStageGestures } from "./chrome/use-stage-gestures";
import { HeardStage } from "./heard/heard-stage";
import { MirrorStage } from "./mirror/mirror-stage";
import { STAGE_FADE_MS } from "./motion";
import { NextStage } from "./next/next-stage";
import { useReflect } from "./reflect-data";
import { type ReflectDraw, ReflectDrawContext } from "./reflect-draw";
import type { ReflectStage } from "./reflect-model";
import { WaitStage } from "./wait/wait-stage";
import { WriteStage } from "./write/write-stage";

const TAU = Math.PI * 2;
/** The light's breath (card-light): 4.8 s. */
const BREATH_S = 4.8;
/** Board `.bglow`: the dim takes .6 s. */
const DIM_MS = 600;

type StageView = "write" | "wait" | "mirror" | "next" | "heard";
const VIEW_OF: Record<ReflectStage, StageView> = {
	heard: "heard",
	land: "wait",
	mirror: "mirror",
	next: "next",
	wait: "wait",
	write: "write",
};
const VIEWS: Record<StageView, () => JSX.Element> = {
	heard: HeardStage,
	mirror: MirrorStage,
	next: NextStage,
	wait: WaitStage,
	write: WriteStage,
};

/**
 * Reflect, zoomed open from Today's card. The chrome draws at once; the stage follows when the
 * session has read (`ready`). The session lives on the server, so closing at any stage keeps it,
 * and Today's card says where it is.
 */
export function ReflectScreen() {
	const { state } = useReflect();
	const { stage, heavy, late, ready } = state;
	const reduced = useEffectiveReducedMotion();
	const live = useLive(reduced);
	const [low, setLow] = useState(false);

	const clock = useClock(live);
	const breath = useDerivedValue(
		() => 0.5 - 0.5 * Math.cos((TAU * clock.get()) / BREATH_S)
	);
	const dim = useSharedValue(0);
	const surge = useSharedValue(0);
	const tide = useSharedValue(0);
	const liftFrom = useSharedValue({ x: 0, y: 0 });

	useStageGestures();

	// Dimmed to 5% while it thinks and when the mirror is heavy (board `.bglow.dim`).
	const dimmed =
		stage === "wait" || stage === "land" || (heavy && stage === "mirror");
	useEffect(() => {
		dim.set(
			withTiming(dimmed ? 1 : 0, { duration: DIM_MS, ...PLAY_AS_CHOSEN })
		);
	}, [dimmed, dim]);

	// Opened onto any stage but Write (a ready mirror, a wait still going, Where next), the screen
	// mounts its sky and header first and the stage a frame later, so the zoom from Today's card
	// starts on the first frame instead of waiting on the mirror's animated words. Write mounts at
	// once: its field takes focus as Reflect opens.
	const [stageUp, setStageUp] = useState(() => VIEW_OF[stage] === "write");
	useEffect(() => {
		if (stageUp || !ready) {
			return;
		}
		const id = requestAnimationFrame(() => setStageUp(true));
		return () => cancelAnimationFrame(id);
	}, [stageUp, ready]);

	const draw: ReflectDraw = {
		late,
		liftFrom,
		light: { breath, dim, surge, tide },
		live,
		low,
		reduced,
		setLow,
	};
	const view = VIEW_OF[stage];
	const Stage = VIEWS[view];
	const fade = reduced ? REDUCED_FADE_MS : STAGE_FADE_MS;

	return (
		<ReflectDrawContext value={draw}>
			<View className="flex-1 bg-background">
				<ReflectSky late={late} />
				<AmbientLight late={late} light={draw.light} />
				{/* First in the tree, so VoiceOver and TalkBack read ✕, the stage's name and help
				    before the stage; `z-10` keeps it drawn over the stage. */}
				<ReflectHeader />
				{stageUp && ready ? (
					<Animated.View
						className="absolute inset-0"
						entering={FadeIn.duration(fade).reduceMotion(ReduceMotion.Never)}
						exiting={FadeOut.duration(fade).reduceMotion(ReduceMotion.Never)}
						key={view}
					>
						<Stage />
					</Animated.View>
				) : null}
			</View>
		</ReflectDrawContext>
	);
}
