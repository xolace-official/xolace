import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { MorphLoader } from "@/components/shared/loader/morph/morph-loader";
import { SkyWash } from "@/components/shared/sky-wash";
import { useAppActive } from "@/components/shared/use-app-active";
import { useBoardY } from "@/design/board";
import { useFixedFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { SessionFooter } from "./chrome/session-footer";
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
import { useKeptAtMoment2 } from "./use-kept-at-moment-2";
import { useMomentFlow } from "./use-moment-flow";
import { useNextKey } from "./use-next-key";
import { useSessionClocks } from "./use-session-clocks";

const SKY_SCALE = 0.38 / 0.6;

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
	const dark = useScheme() === "dark";
	const lightColors = useSessionColors(late || dark ? "late" : "day");
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
	const words = useKeptAtMoment2(moment, session.state.words);

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
			<SkyWash late={late} scale={SKY_SCALE} />
			{live ? null : (
				<View className="absolute inset-0 items-center justify-center">
					<MorphLoader />
				</View>
			)}
			{live && moment === 1 ? (
				<MomentOne
					c1={clocks.c1}
					c2={clocks.c2}
					colors={colors}
					day={session.state.day}
					fit={fit.fit}
					late={late}
					lightColors={lightColors}
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
					cards={session.state.cards}
					colors={colors}
					cs={clocks.cs}
					ctaTop={ctaTop}
					from={session.state.from}
					letterTile={session.state.letterTile}
					next={next}
					onNext={() => session.actions.openNext(next)}
					parts={session.state.parts}
					reduced={reduced}
					send={send}
					W={W}
					words={words}
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
