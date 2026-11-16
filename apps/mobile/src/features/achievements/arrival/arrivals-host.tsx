import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import {
	Arrival,
	type ArrivalHandle,
} from "@/features/achievements/arrival/arrival";
import {
	ArrivalData,
	useArrivalsState,
} from "@/features/achievements/arrival/arrival-data";
import type { Still } from "@/features/achievements/arrival/arrival-start";
import { BackfillStage } from "@/features/achievements/arrival/backfill/backfill-stage";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** The fade in and out, as a full-screen modal fades (react-native-screens' 350 ms). */
const FADE_MS = 350;

/**
 * The badges' arrival over the app (a host in `navigation/hosts.ts`): staged
 * hidden as soon as something is due, so opening only fades it in and starts
 * its clock, and the moment's first frame waits on no React work (arrivals §6).
 * An overlay rather than a route: a push re-renders every scene of the stack.
 * It can't draw over a natively presented screen, and the gate keeps it off
 * those (`held-routes.ts`).
 */
export function ArrivalsHost() {
	return (
		<ArrivalData>
			<ArrivalOverlay />
		</ArrivalData>
	);
}

/** The overlay under its provider; a dev state passes a held frame (`still`). */
export function ArrivalOverlay({ still }: { still?: Still }) {
	const { state, actions } = useArrivalsState();
	const { plan, open } = state;
	const reduced = useEffectiveReducedMotion();
	const shown = useSharedValue(0);
	const arrival = useRef<ArrivalHandle>(null);
	const fade = {
		duration: reduced ? REDUCED_FADE_MS : FADE_MS,
		easing: Easing.inOut(Easing.ease),
		...PLAY_AS_CHOSEN,
	};

	const leave = () => {
		shown.set(
			withTiming(0, fade, (done) => {
				if (done) {
					scheduleOnRN(actions.closed);
				}
			})
		);
	};

	useEffect(() => {
		if (!open) {
			return;
		}
		arrival.current?.start();
		shown.set(withTiming(1, fade));
		// Android's back closes the moment, as it closed the old route.
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			leave();
			return true;
		});
		return () => sub.remove();
	}, [open]);

	const style = useAnimatedStyle(() => ({ opacity: shown.get() }));

	return (
		<Animated.View
			accessibilityElementsHidden={!open}
			accessibilityViewIsModal={open}
			className="absolute inset-0"
			importantForAccessibility={open ? "yes" : "no-hide-descendants"}
			pointerEvents={open ? "auto" : "none"}
			style={[{ opacity: 0 }, style]}
		>
			{plan?.kind === "badges" ? (
				<Arrival
					badges={plan.badges}
					key={plan.ids.join()}
					milestone={plan.milestone}
					onDone={leave}
					ref={arrival}
					still={still}
				/>
			) : null}
			{plan?.kind === "backfill" && open ? (
				<BackfillStage
					onClose={leave}
					onSee={() => {
						actions.seeBadges();
						leave();
					}}
					plan={plan}
				/>
			) : null}
		</Animated.View>
	);
}
