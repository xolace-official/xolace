import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useAppActive } from "@/components/shared/use-app-active";
import { useFixedFaces } from "@/design/fonts";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useBoardY } from "./board-y";
import { SessionFooter } from "./chrome/session-footer";
import { SessionSky } from "./chrome/sky";
import { FaceStage } from "./face/face-stage";
import { useSessionFace } from "./face/use-session-face";
import { useFaceFit } from "./moment-one/fit";
import { MomentOne } from "./moment-one/moment-one";
import { useMoodSlider } from "./moment-one/use-mood-slider";
import { MomentTwo } from "./moment-two/moment-two";
import { useSend } from "./moment-two/use-send";
import { hasSparkle } from "./mood-scale";
import { applyScene, type Scene } from "./scene";
import { useSessionColors } from "./session-colors";
import { useSessionEnd } from "./session-end-data";
import { ctaLabel } from "./session-end-model";
import { LAYOUT } from "./session-look";
import { useMomentFlow } from "./use-moment-flow";
import { useNextKey } from "./use-next-key";
import { useSessionClocks } from "./use-session-clocks";

/**
 * After a session (handoff `after.md`): one route, two moments, one face.
 * Moment 1 asks how you feel now, the Xolace face reacting to one slider;
 * moment 2 offers to leave your words for someone, then one next step. The
 * motion is three UI-thread clocks; React renders when a moment, a step, the
 * hold or the share changes. `scene` is a dev state's starting point.
 */
export function SessionEndScreen({ scene }: { scene?: Scene }) {
	const session = useSessionEnd();
	const { late, ready } = session.state;
	const { width: W, height: H } = useWindowDimensions();
	const y = useBoardY();
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const active = useAppActive();
	const running = focused && active;
	const colors = useSessionColors(late ? "late" : "day");
	const faces = useFixedFaces("mirror");
	const clocks = useSessionClocks();
	const touched = useSharedValue(0);
	const driving = useSharedValue(0);
	const fit = useFaceFit(y, H);
	const slider = useMoodSlider(LAYOUT.track.thumb / 2, { driving, touched });
	const face = useSessionFace({
		driving,
		late,
		pos: slider.pos,
		reduced,
		running,
	});
	const flow = useMomentFlow({
		clocks,
		driving,
		face,
		late,
		session,
		slider,
		touched,
	});
	const send = useSend({
		clocks,
		face,
		onShare: session.actions.share,
		reduced,
	});
	const { moment, step, unsure } = flow.answer;
	const next = useNextKey({ late, moment, session, step });

	// The arrival starts once, when the session and the faces are in.
	const started = useRef(false);
	const live = ready && faces;
	useEffect(() => {
		if (!live || started.current) {
			return;
		}
		started.current = true;
		flow.arrive(scene?.at?.clock !== "c1");
		if (scene) {
			applyScene(scene, { clocks, face, flow, send, slider });
		}
	});

	const ctaTop = H - LAYOUT.cta.bottom2 - LAYOUT.cta.height;
	return (
		<View className="flex-1 bg-background">
			<StatusBar style={late ? "light" : "auto"} />
			<SessionSky colors={colors} tone={late ? "late" : "day"} />
			{live && moment === 1 ? (
				<MomentOne
					c1={clocks.c1}
					c2={clocks.c2}
					colors={colors}
					day={session.state.day}
					fit={fit.fit}
					late={late}
					onBottom={fit.onBottom}
					onTop={fit.onTop}
					onUnsure={flow.pickUnsure}
					reduced={reduced}
					slider={slider}
					step={step}
					touched={touched}
					unsure={unsure}
					W={W}
					y={y}
				/>
			) : null}
			{live && moment === 2 ? (
				<MomentTwo
					breath={face.breath}
					c2={clocks.c2}
					colors={colors}
					cs={clocks.cs}
					ctaTop={ctaTop}
					from={session.state.from}
					listener={session.state.listener}
					next={next}
					onNext={() => session.actions.openNext(next)}
					reduced={reduced}
					send={send}
					W={W}
					words={session.state.words}
					y={y}
				/>
			) : null}
			{live ? (
				<FaceStage
					bobbing={moment === 1}
					breath={face.breath}
					c1={clocks.c1}
					c2={clocks.c2}
					dy={fit.fit.dy}
					eyes={
						moment === 1 && !unsure && hasSparkle(step) ? "sparkle" : "round"
					}
					face={face.face}
					fit={fit.fit.fit}
					late={late}
					pos={slider.pos}
					reduced={reduced}
					top={y(LAYOUT.face.top)}
					W={W}
				/>
			) : null}
			{live ? (
				<SessionFooter
					c1={clocks.c1}
					c2={clocks.c2}
					label={ctaLabel({ late, moment, step, unsure })}
					onAnother={flow.another}
					onPress={moment === 2 ? flow.done : flow.cont}
					reduced={reduced}
				/>
			) : null}
		</View>
	);
}
