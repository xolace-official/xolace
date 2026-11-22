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
