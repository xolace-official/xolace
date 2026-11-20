import { useEffect, useEffectEvent, useRef } from "react";
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
import { setArrivalOpen } from "@/features/achievements/arrival-open";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const FADE_MS = 350;

export function ArrivalsHost({
	isPresented,
}: {
	isPresented: (pathname: string) => boolean;
}) {
	return (
		<ArrivalData isPresented={isPresented}>
			<ArrivalOverlay />
		</ArrivalData>
	);
}

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

	const appear = useEffectEvent(() => {
		arrival.current?.start();
		shown.set(withTiming(1, fade));
	});
	const back = useEffectEvent(leave);
	useEffect(() => {
		if (!open) {
			return;
		}
		appear();
		setArrivalOpen(true);
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			back();
			return true;
		});
		return () => {
			sub.remove();
			setArrivalOpen(false);
		};
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
