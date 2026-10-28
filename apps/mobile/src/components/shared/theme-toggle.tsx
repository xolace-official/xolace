import { isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import type { FC } from "react";
import { TouchableOpacity } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import { useAppTheme } from "@/context/app-theme-context";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const MOON_ICON = {
	android: "dark_mode",
	ios: "moon.fill",
	web: "dark_mode",
} as const;
const SUN_ICON = {
	android: "light_mode",
	ios: "sun.max.fill",
	web: "light_mode",
} as const;

export const ThemeToggle: FC = () => {
	const { toggleTheme, isLight } = useAppTheme();
	const tintColor = useThemeColor("foreground") as string;

	const isLGAvailable = isLiquidGlassAvailable();

	return (
		<TouchableOpacity
			activeOpacity={0.8}
			className={cn("z-50 p-3", isLGAvailable && "px-2.5 py-2")}
			hitSlop={12}
			onPressIn={() => {
				playSoftPress();
			}}
			onPressOut={() => {
				toggleTheme();
			}}
		>
			{isLight ? (
				<Animated.View entering={ZoomIn} exiting={FadeOut} key="moon">
					<SymbolView name={MOON_ICON} size={20} tintColor={tintColor} />
				</Animated.View>
			) : (
				<Animated.View entering={ZoomIn} exiting={FadeOut} key="sun">
					<SymbolView name={SUN_ICON} size={20} tintColor={tintColor} />
				</Animated.View>
			)}
		</TouchableOpacity>
	);
};
