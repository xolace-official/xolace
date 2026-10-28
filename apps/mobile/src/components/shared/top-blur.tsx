// Progressive blur under the transparent header (from
// clarity-main glass-tabs/progressive-blur): one BlurView alpha-masked by an
// eased gradient, plus a --background scrim so the title stays legible.
// Android gets the scrim only (BlurView under a MaskedView is unreliable there).

import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native";
import { Platform, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/context/app-theme-context";

const MASK =
	"linear-gradient(to bottom, rgb(0,0,0) 0%, rgb(0,0,0) 35%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)";

export function TopBlur({ height }: { height: number }) {
	const { isDark } = useAppTheme();
	const bg = useThemeColor("background") as string;
	const strong = Platform.OS === "android" ? "F0" : "B0";
	return (
		<View
			className="absolute inset-x-0 top-0"
			pointerEvents="none"
			style={{ height }}
		>
			{Platform.OS === "ios" && (
				<MaskedView
					maskElement={
						<View style={{ experimental_backgroundImage: MASK, flex: 1 }} />
					}
					style={StyleSheet.absoluteFill}
				>
					<BlurView
						intensity={40}
						style={StyleSheet.absoluteFill}
						tint={isDark ? "dark" : "light"}
					/>
				</MaskedView>
			)}
			<LinearGradient
				colors={[bg + strong, bg + "50", bg + "00"]}
				locations={[0, 0.5, 1]}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
}
