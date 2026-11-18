import type { ReactNode } from "react";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { ENTER_EASE, GO, IN_EASE, INTRO, seg } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";

/**
 * One group's entrance (its step in the cascade, §2.8) and its exit (30 ms steps, §6): it
 * fades up 8 pt as the screen opens, and fades out dropping 10 pt as the talk starts.
 */
export function useGroupStyle(
	motion: TalkMotion,
	enter: number,
	exit: number,
	fade: number = GO.groupsFade
) {
	return useAnimatedStyle(() => {
		const reduced = motion.reduced.get();
		const g = motion.go.get();
		const i = motion.intro.get();
		const inP = reduced
			? seg(i, 0, GO.reduced)
			: seg(i, enter * INTRO.gap, INTRO.length, ENTER_EASE);
		const out = reduced
			? seg(g, 0, GO.reduced / 2)
			: seg(g, exit * GO.groupsGap, fade, IN_EASE);
		const drop = reduced
			? 0
			: GO.dropBy * seg(g, exit * GO.groupsGap, GO.groupsDrop, IN_EASE);
		return {
			opacity: inP * (1 - out),
			transform: [{ translateY: INTRO.rise * (1 - inP) + drop }],
		};
	});
}

export function StartGroup({
	motion,
	enter,
	exit,
	gap = 0,
	children,
}: {
	motion: TalkMotion;
	enter: number;
	exit: number;
	gap?: number;
	children: ReactNode;
}) {
	const style = useGroupStyle(motion, enter, exit);
	return <Animated.View style={[{ gap }, style]}>{children}</Animated.View>;
}
