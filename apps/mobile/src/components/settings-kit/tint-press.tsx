import type { ReactNode } from "react";
import { Pressable, type ViewStyle } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { S } from "@/components/settings-kit/settings-layout";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";

const FADE_BACK = { duration: S.pressFadeMs, ...PLAY_AS_CHOSEN };

/**
 * A settings row's press: the tint shows at once and fades back over 150 ms, a
 * light tick, no scale (an opacity change, so it stays with reduced motion).
 */
export function TintPress({
	children,
	onPress,
	tint = "bg-surface-secondary",
	className,
	style,
	accessibilityLabel,
	accessibilityRole = "button",
	accessibilityState,
}: {
	children: ReactNode;
	onPress?: () => void;
	/** The pressed tint, as a `bg-*` class. */
	tint?: string;
	className?: string;
	style?: ViewStyle;
	accessibilityLabel?: string;
	accessibilityRole?: "button" | "radio";
	accessibilityState?: { selected?: boolean; checked?: boolean };
}) {
	const down = useSharedValue(0);
	const under = useAnimatedStyle(() => ({ opacity: down.get() }));
	return (
		<Pressable
			accessibilityLabel={accessibilityLabel}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
			className={className}
			onPress={() => {
				Presets.System.selection();
				onPress?.();
			}}
			onPressIn={() => down.set(1)}
			onPressOut={() => down.set(withTiming(0, FADE_BACK))}
			style={style}
		>
			<Animated.View
				className={cn("absolute inset-0", tint)}
				pointerEvents="none"
				style={under}
			/>
			{children}
		</Pressable>
	);
}
