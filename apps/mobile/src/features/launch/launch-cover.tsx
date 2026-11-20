import { Image } from "expo-image";
import { useObserve } from "expo-observe";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useEffectEvent, useState } from "react";
import { Platform, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { isNightHour } from "@/context/session-mode-context";
import { EaseView } from "@/design/ease";
import { loopOrSettle } from "@/design/ease-loops";
import { breathPeriod } from "@/design/motion";
import { BREATH, PLAY_AS_CHOSEN } from "@/design/springs";
import { useOSReducedMotion } from "@/lib/motion/os-reduced-motion";
import { releaseNativeAppearance } from "@/lib/native-appearance";
import { useAppStore } from "@/store/store";
import { LAUNCH_COPY } from "./copy";
import { runCoverClock } from "./launch-clock";
import {
	COVER_CLASS,
	EXIT_LIFT,
	type HoldReason,
	logoBox,
	LAUNCH_TIMING as T,
} from "./launch-model";
import { useLaunch } from "./launch-store";
import { useLaunchReports } from "./use-launch-reports";

const LOGO = require("@/assets/images/icons/splash-icon.png");
const BOX = logoBox(Platform.OS);
const LOGO_SIZE = { height: BOX, width: BOX };
const BREATH_REST = { scale: 1, translateY: 0 };
const BREATH_PEAK = { scale: BREATH.scale, translateY: -BREATH.rise };

export function LaunchCover() {
	const run = useLaunch((s) => s.run);
	const gone = useLaunch((s) => s.phase === "gone");
	return (
		<>
			{/* Outlives the cover: a launch that timed out is interactive when its holds clear. */}
			<CoverClock key={`clock-${run}`} />
			{gone ? null : <Cover key={`cover-${run}`} />}
		</>
	);
}

let nativeHidden = false;
function hideNativeSplash() {
	if (nativeHidden) {
		return;
	}
	nativeHidden = true;
	SplashScreen.hideAsync().catch(() => undefined);
}

function CoverClock() {
	const { markInteractive } = useObserve();
	const reports = useLaunchReports();
	const timedOut = useEffectEvent((holds: readonly HoldReason[]) =>
		reports.coverTimedOut(holds)
	);
	const interactive = useEffectEvent((coverTimedOut: boolean) =>
		markInteractive({ params: { coverTimedOut } })
	);
	useEffect(
		() =>
			runCoverClock(useLaunch, {
				hideNativeSplash,
				interactive,
				leave: () => useLaunch.getState().leave(),
				releaseNativeAppearance,
				timedOut,
			}),
		[]
	);
	return null;
}

const launchBreathPeriod = () =>
	breathPeriod(
		useAppStore.getState().nightModeEnabled &&
			isNightHour(new Date().getHours())
	);

function Cover() {
	const reduced = useOSReducedMotion();
	const leaving = useLaunch((s) => s.phase !== "cover");
	const scheme = useLaunch((s) => s.scheme);
	const [period] = useState(launchBreathPeriod);
	const opacity = useSharedValue(1);
	const lift = useSharedValue(0);

	useEffect(() => {
		if (!leaving) {
			return;
		}
		const duration = reduced ? T.reducedExitMs : T.exitMs;
		if (!reduced) {
			lift.set(
				withTiming(1, {
					duration,
					easing: Easing.out(Easing.cubic),
					...PLAY_AS_CHOSEN,
				})
			);
		}
		const { done } = useLaunch.getState();
		opacity.set(
			withTiming(
				0,
				{ duration, easing: Easing.out(Easing.quad), ...PLAY_AS_CHOSEN },
				(finished) => {
					if (finished) {
						scheduleOnRN(done);
					}
				}
			)
		);
	}, [leaving, reduced, lift, opacity]);

	const coverStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	const liftStyle = useAnimatedStyle(() => {
		const l = lift.get();
		return {
			transform: [
				{ translateY: EXIT_LIFT.translateY * l },
				{ scale: 1 + (EXIT_LIFT.scale - 1) * l },
			],
		};
	});

	return (
		<Animated.View
			accessibilityElementsHidden={leaving}
			accessibilityLabel={LAUNCH_COPY.cover}
			accessibilityViewIsModal={!leaving}
			accessible={!leaving}
			className={`absolute inset-0 z-100 ${COVER_CLASS[scheme]}`}
			importantForAccessibility={leaving ? "no-hide-descendants" : "yes"}
			pointerEvents={leaving ? "none" : "auto"}
			style={coverStyle}
			testID="launch-cover"
		>
			<View className="flex-1 items-center justify-center">
				<Animated.View style={liftStyle}>
					{/*
						Mounted looping, never remounted: a remount redraws the logo a frame late,
						a blink. The delay keeps a fast launch still; leaving eases it back to rest.
					*/}
					<EaseView
						{...loopOrSettle({
							delay: T.breatheAfterMs,
							from: BREATH_REST,
							periodMs: period,
							reduced,
							running: !leaving,
							to: BREATH_PEAK,
						})}
					>
						<Image
							contentFit="contain"
							onDisplay={hideNativeSplash}
							priority="high"
							source={LOGO}
							style={LOGO_SIZE}
							transition={0}
						/>
					</EaseView>
				</Animated.View>
			</View>
		</Animated.View>
	);
}
