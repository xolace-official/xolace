import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { Pressable, StyleSheet } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const GLASS = isLiquidGlassAvailable();

type Props = {
	isOpen: SharedValue<boolean>;
	isOpenJS: boolean;
	onPress: () => void;
};

export const MenuTrigger = ({ isOpen, isOpenJS, onPress }: Props) => {
	const foregroundColor = useThemeColor("foreground") as string;

	// With glass the dim moves to the icon: an animated opacity above the glass stops its blur rendering.
	const rStyle = useAnimatedStyle(() => ({
		opacity: GLASS ? 1 : withTiming(isOpen.get() ? 0.5 : 1),
		transform: [{ scale: withTiming(isOpen.get() ? 0.6 : 1) }],
	}));
	const iconStyle = useAnimatedStyle(() => ({
		opacity: GLASS ? withTiming(isOpen.get() ? 0.5 : 1) : 1,
	}));

	const icon = (
		<Animated.View style={iconStyle}>
			<SymbolView
				name={{ android: "menu", ios: "line.3.horizontal" } as any}
				size={22}
				tintColor={foregroundColor}
			/>
		</Animated.View>
	);

	return (
		<AnimatedPressable
			accessibilityHint={
				isOpenJS
					? "Closes navigation options"
					: "Opens navigation options: Discovery, Vent, Settings"
			}
			accessibilityLabel={isOpenJS ? "Close menu" : "Open menu"}
			accessibilityRole="button"
			className={GLASS ? undefined : "border-foreground/16"}
			hitSlop={8}
			onPress={() => {
				if (isOpenJS) {
					Presets.flick();
				} else {
					Presets.thud();
				}
				onPress();
			}}
			style={[GLASS ? undefined : styles.fallback, rStyle]}
		>
			{/* Icon inside the glass so every touch on the circle reaches it (its press swell). */}
			{GLASS ? (
				<GlassView
					glassEffectStyle="regular"
					isInteractive
					style={styles.glass}
				>
					{icon}
				</GlassView>
			) : (
				icon
			)}
		</AnimatedPressable>
	);
};

const shape = {
	alignItems: "center",
	borderCurve: "continuous",
	borderRadius: 26,
	height: 52,
	justifyContent: "center",
	width: 52,
} as const;

const styles = StyleSheet.create({
	fallback: { ...shape, borderWidth: 0.5, overflow: "hidden" },
	glass: { ...shape, overflow: "visible" },
});
