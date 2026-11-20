import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { playSoftPress } from "@/lib/haptics";
import { KEYBOARD_GAP } from "@/lib/keyboard/keyboard-lift-math";
import { useKeyboardLift } from "@/lib/keyboard/use-keyboard-lift";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { lookAt, lookIndex } from "./companion-look";
import { StartComposer } from "./composer/start-composer";
import { FootnoteOverlay, TalkChrome } from "./header/talk-chrome";
import { composerLift, useStageFrame } from "./hero/stage-frame";
import { TalkHero, UNMEASURED } from "./hero/talk-hero";
import { useHeroFace } from "./hero/use-hero-face";
import { useLookCarousel } from "./hero/use-look-carousel";
import { useTalkGeometry } from "./motion/talk-geometry";
import { LAYOUT } from "./motion/talk-motion";
import { usePhaseMotion } from "./motion/use-phase-motion";
import { useTalkMotion } from "./motion/use-talk-motion";
import { LeaveGuard } from "./stage/leave-guard";
import { TalkAurora } from "./stage/talk-aurora";
import { TalkStage } from "./stage/talk-stage";
import { TalkStart } from "./start/talk-start";
import { useTalkScreen } from "./talk-data";
import { heardCount } from "./talk-model";
import { ThreadLayer } from "./thread/thread-layer";
import { useKeepAwakeWhile } from "./use-keep-awake-while";
import { useTalkAnnouncements } from "./use-talk-announcements";

export function TalkScreen() {
	const { state, actions } = useTalkScreen();
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const geo = useTalkGeometry();
	const index = lookIndex(state.look);
	const [face, setFace] = useState<number>(LAYOUT.face);
	const carTop = useSharedValue(UNMEASURED);
	const startTop = useSharedValue(geo.startTop);
	const { keyboard } = useKeyboardLift();
	const lift = useDerivedValue(() =>
		composerLift(keyboard.get(), geo.insets.bottom)
	);
	const before = state.phase === "start";
	const onStage = !before && state.view === "companion";
	const talking =
		state.sample !== null || (!before && state.presence === "Speaking");
	const listening = state.phase === "talk" && state.presence === "Listening";
	const motion = useTalkMotion({
		phase: state.phase,
		reduced,
		talking,
		view: state.view,
	});
	usePhaseMotion(motion, state.phase, state.view);
	useKeepAwakeWhile(focused);
	const hero = useHeroFace({
		before,
		heard: heardCount(state.turns),
		level: state.micLevel,
		listening: listening && onStage,
		presence: state.presence,
		running: focused && (before || onStage),
		sampling: state.sample !== null,
	});
	const carousel = useLookCarousel({
		enabled: before,
		index,
		onLand: (i) => {
			playSoftPress();
			actions.setLook(lookAt(i));
			hero.face.hop();
		},
		reduced,
	});
	const frame = useStageFrame(geo, keyboard);

	const stopSample = useEffectEvent(() => actions.stopSample());
	useEffect(() => {
		if (focused && before) {
			return () => stopSample();
		}
	}, [focused, before]);
	useTalkAnnouncements(state);

	const stageStyle = useAnimatedStyle(() => ({
		opacity: motion.stage.get(),
		transform: [{ scale: 0.96 + 0.04 * motion.stage.get() }],
	}));

	return (
		<View className="flex-1 bg-background">
			<LeaveGuard reduced={reduced}>
				<TalkAurora
					inTalk={!before}
					running={focused && !reduced}
					talking={talking}
				/>
				<TalkStart
					before={before}
					carTop={carTop}
					face={face}
					geo={geo}
					index={index}
					motion={motion}
					onDot={carousel.goTo}
					onFit={(o) =>
						setFace((f) =>
							Math.min(LAYOUT.face, Math.max(LAYOUT.minFace, f - o))
						)
					}
					orbs={focused && before && !reduced}
					reduced={reduced}
					startTop={startTop}
				/>
				<ThreadLayer
					focused={focused}
					geo={geo}
					lift={lift}
					motion={motion}
					offset={geo.insets.bottom + LAYOUT.composerGap - KEYBOARD_GAP}
					open={state.view === "conversation" && !before}
					reduced={reduced}
				/>
				<Animated.View
					accessibilityElementsHidden={!(before || onStage)}
					className="absolute inset-0"
					importantForAccessibility={
						before || onStage ? "auto" : "no-hide-descendants"
					}
					pointerEvents="box-none"
					style={stageStyle}
				>
					<TalkHero
						before={before}
						carousel={carousel}
						carTop={carTop}
						face={face}
						frame={frame}
						geo={geo}
						hero={hero.face}
						index={index}
						motion={motion}
					/>
					{before ? null : (
						<TalkStage
							frame={frame}
							geo={geo}
							motion={motion}
							onRelax={hero.relax}
							onSmile={hero.smile}
							onSmileBack={hero.smileBack}
							reduced={reduced}
							touchable={state.phase === "talk" && onStage}
						/>
					)}
				</Animated.View>
				<TalkChrome
					before={before}
					focused={focused}
					geo={geo}
					lift={lift}
					motion={motion}
				/>
				<StartComposer
					before={before}
					geo={geo}
					lift={lift}
					motion={motion}
					startTop={startTop}
				/>
				<FootnoteOverlay before={before} motion={motion} startTop={startTop} />
			</LeaveGuard>
		</View>
	);
}
