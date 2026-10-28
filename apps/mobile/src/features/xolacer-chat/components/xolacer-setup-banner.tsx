import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

// A bare string is an SF Symbol — iOS only. Android needs the platform map.
const ARROW_ICON = {
	android: "arrow_forward",
	ios: "arrow.right",
	web: "arrow_forward",
} as const;

/** Shown to xolacers whose profile isn't published yet — the only entry into setup. */
export function XolacerSetupBanner() {
	const router = useRouter();
	const accent = useThemeColor("accent");

	return (
		<PressableFeedback
			accessibilityLabel="Set up your Xolacer profile"
			accessibilityRole="button"
			onPress={() => {
				playSoftPress();
				router.push("/xolacer-setup");
			}}
		>
			<View
				className="flex-row items-center gap-3 rounded-3xl border border-accent/25 bg-accent/8 p-4"
				style={styles.borderCurve}
			>
				<View className="flex-1">
					<AppText className="font-semibold text-foreground text-sm">
						Set up your Xolacer profile
					</AppText>
					<AppText className="mt-0.5 text-muted text-xs">
						People can&apos;t find you until it&apos;s published.
					</AppText>
				</View>
				<SymbolView name={ARROW_ICON as any} size={16} tintColor={accent} />
			</View>
		</PressableFeedback>
	);
}
