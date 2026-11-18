import type { ComponentProps, Ref } from "react";
import { Pressable, type View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { HERO } from "./hero-model";
import type { Hold } from "./use-hold";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = ComponentProps<typeof Pressable> & {
	hold: Hold;
	ref?: Ref<View>;
};

/**
 * The Reflect card's touch surface. It takes the tap and the hold; S2 wraps it in
 * Link.Trigger, which hands it onPress and its ref (so the zoom starts from this view). The hold is a long press of 620 ms
 * after a 120 ms rest, so a scroll never lights the rim; only while the card
 * is at rest (use-hold `holdable`). VoiceOver can't see inside Link.Trigger, so the
 * card's accessibility lives in card-a11y already.
 */
export function HeroPressable({ hold, style, children, ...rest }: Props) {
	const scale = useAnimatedStyle(() => ({
		transform: [{ scale: hold.scale.get() }],
	}));
	return (
		<AnimatedPressable
			accessibilityElementsHidden
			accessible={false}
			// No background of its own (Skia draws the surface): keep Fabric from flattening it,
			// so the zoom source gets exactly one child.
			collapsable={false}
			// Without a hold, a long press is just a slow tap: it opens Reflect.
			delayLongPress={hold.holdable ? HERO.holdMs : undefined}
			disabled={hold.chosen}
			importantForAccessibility="no-hide-descendants"
			onLongPress={hold.holdable ? () => hold.choose() : undefined}
			onPressIn={hold.pressIn}
			onPressMove={hold.pressMove}
			onPressOut={hold.pressOut}
			style={[
				{ borderRadius: HERO.radius },
				scale,
				typeof style === "function" ? undefined : style,
			]}
			unstable_pressDelay={HERO.pressDelayMs}
			{...rest}
		>
			{children}
		</AnimatedPressable>
	);
}
