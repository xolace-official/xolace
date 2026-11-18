import * as Sentry from "@sentry/react-native";
import { Image } from "expo-image";
import { useObserve } from "expo-observe";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
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
import {
	COVER_CLASS,
	coverMayLeave,
	EXIT_LIFT,
	logoBox,
	LAUNCH_TIMING as T,
} from "./launch-model";
import { useLaunch } from "./launch-store";

/** The native splash's own logo (`app.config.ts`, `expo-splash-screen`). */
const LOGO = require("@/assets/images/icons/splash-icon.png");
const BOX = logoBox(Platform.OS);
const LOGO_SIZE = { height: BOX, width: BOX };
/** The logo's breath while the cover waits: the app's BREATH, 3 pt up and 1.02. */
const BREATH_REST = { scale: 1, translateY: 0 };
const BREATH_PEAK = { scale: BREATH.scale, translateY: -BREATH.rise };

/**
 * The launch cover: the native splash and production's old boot loader, as one. It mounts on
 * the first JS frame identical to the native splash, so hiding the native one shows no change.
 * The logo breathes while anything holds it, then lifts a little as the cover fades over the
 * first screen. No minimum time: if nothing is loading, it leaves at once. Drawn above every
 * provider, so it needs no fonts, theme or navigator.
 */
export function LaunchCover() {
	const run = useLaunch((s) => s.run);
	const gone = useLaunch((s) => s.phase === "gone");
	if (gone) {
		return null;
	}
	return <Cover key={run} />;
}

/** Hides the native splash, once per process; the cover under it is the same picture. */
let nativeHidden = false;
function hideNativeSplash() {
	if (nativeHidden) {
		return;
	}
	nativeHidden = true;
	SplashScreen.hideAsync().catch(() => undefined);
}

/** One breath, slower at night, as Today's loops: read once, the cover is up for seconds. */
const launchBreathPeriod = () =>
	breathPeriod(
		useAppStore.getState().nightModeEnabled &&
			isNightHour(new Date().getHours())
	);

function Cover() {
	const reduced = useOSReducedMotion();
	const { markInteractive } = useObserve();
	const holds = useLaunch((s) => s.holds);
	const scheme = useLaunch((s) => s.scheme);
	const [period] = useState(launchBreathPeriod);
	const [timedOut, setTimedOut] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const opacity = useSharedValue(1);
	const lift = useSharedValue(0);

	useEffect(() => {
		const timers = [
			// If the art never reports it is on screen, don't leave the native splash up.
			setTimeout(hideNativeSplash, T.nativeHideFallbackMs),
			// Never hang: past this, whatever still loads shows its own quiet state.
			setTimeout(() => setTimedOut(true), T.maxCoverMs),
		];
		return () => {
			for (const id of timers) {
				clearTimeout(id);
			}
		};
	}, []);

	const mayLeave = coverMayLeave(holds, timedOut);
	// Leave once nothing holds it, after the first screen has had a frame on screen.
	useEffect(() => {
		if (!mayLeave || leaving) {
			return;
		}
		const id = setTimeout(() => {
			const { holds: still, leave, done } = useLaunch.getState();
			if (still.length > 0) {
				Sentry.addBreadcrumb({
					category: "launch.cover",
					data: { holds: still },
					level: "warning",
					message: "launch cover timed out",
				});
			}
			hideNativeSplash();
			releaseNativeAppearance();
			// Time to interactive: under the cover nothing could be tapped yet.
			markInteractive();
			setLeaving(true);
			leave();
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
		}, T.settleMs);
		return () => clearTimeout(id);
	}, [mayLeave, leaving, reduced, lift, opacity, markInteractive]);

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
