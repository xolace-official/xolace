import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";

const LIFERING_ICON = {
	android: "support",
	ios: "lifepreserver",
	web: "support",
} as const;

/**
 * Persistent, non-dismissible link to crisis resources inside every thread.
 * The post-delivery moderation lane (#344) sends a resources card when a
 * message reads as a crisis; this is the always-there path for everything it
 * misses.
 */
export function SafetyStrip() {
	const router = useRouter();
	const accent = useThemeColor("accent") as string;
	const muted = useThemeColor("muted") as string;

	return (
		<View className="flex-row items-center gap-2 border-border/40 border-b bg-surface-secondary px-4 py-2">
			<SymbolView name={LIFERING_ICON} size={13} tintColor={muted} />
			<AppText className="flex-1 text-[11px] text-muted">
				Something urgent?
			</AppText>
			<PressableFeedback
				accessibilityLabel="Open crisis resources"
				accessibilityRole="button"
				onPress={() => {
					playSoftPress();
					router.push("/crisis-resources?from=xolacer_chat");
				}}
			>
				<AppText
					className="font-semibold text-[11px]"
					style={{ color: accent }}
				>
					Crisis resources
				</AppText>
			</PressableFeedback>
		</View>
	);
}
