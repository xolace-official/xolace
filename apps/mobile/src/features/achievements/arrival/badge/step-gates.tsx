import { type ReactNode, useState } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { familyTokens } from "@/features/achievements/achievements-model";
import type { ArrivingBadge } from "@/features/achievements/arrival/arrival-model";
import type { Geo } from "@/features/achievements/arrival/arrival-motion";
import {
	type Eng,
	PH,
	shutAt,
} from "@/features/achievements/arrival/arrival-motion";
import { Confetti } from "@/features/achievements/arrival/badge/confetti";
import { OnceShown } from "@/features/achievements/arrival/once-shown";
import { useTokenColors } from "@/lib/use-token-color";

/** Under the next badge's colour: the one before it, until the arrival closes. */
export function Under({
	eng,
	badges,
	dark,
}: {
	eng: SharedValue<Eng>;
	badges: readonly ArrivingBadge[];
	dark: boolean;
}) {
	const colors = useTokenColors(
		badges.map((b) => familyTokens(b.family, dark).flood)
	);
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		let opacity = 0;
		if (e.tc >= 0) {
			opacity = shutAt(e);
		} else if (e.phase === PH.badge) {
			opacity = 1;
		}
		return {
			backgroundColor: e.step > 0 ? colors[e.step - 1] : "transparent",
			opacity,
		};
	});
	return (
		<Animated.View
			className="absolute inset-0"
			pointerEvents="none"
			style={style}
		/>
	);
}

/**
 * A Skia canvas mounted at the milestone's start never draws, so each confetti
 * canvas mounts again once the badge phase has begun, a frame after Next, in a
 * commit of its own; the burst is 1.2 s away.
 */
export function PhaseConfetti({
	eng,
	geo,
	front,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	front: boolean;
}) {
	const [gen, setGen] = useState(0);
	const again = () => setGen((n) => n + 1);
	useAnimatedReaction(
		() => eng.get().phase,
		(p, was) => {
			if (was !== null && p !== was && p === PH.badge) {
				scheduleOnRN(again);
			}
		}
	);
	return (
		<OnceShown>
			<Confetti eng={eng} front={front} geo={geo} key={gen} />
		</OnceShown>
	);
}

/**
 * Badge `i`'s touches and words reach VoiceOver and touch only while it's the
 * one out: a small render of this wrapper when the step reaches or leaves it.
 */
export function StepGate({
	eng,
	i,
	first,
	children,
}: {
	eng: SharedValue<Eng>;
	i: number;
	first: number;
	children: ReactNode;
}) {
	const [on, setOn] = useState(first === i);
	useAnimatedReaction(
		() => eng.get().step === i,
		(v, was) => {
			if (was !== null && v !== was) {
				scheduleOnRN(setOn, v);
			}
		}
	);
	return (
		<View
			accessibilityElementsHidden={!on}
			className="absolute inset-0"
			importantForAccessibility={on ? "auto" : "no-hide-descendants"}
			pointerEvents={on ? "box-none" : "none"}
		>
			{children}
		</View>
	);
}
