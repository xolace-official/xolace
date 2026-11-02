// The consent card's way into the voice-and-look sheet: the chosen voice's orb, its name,
// a chevron.

import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useTalkStyle } from "@/features/talk/use-talk-style";
import { TALK_CAST } from "@/features/talk/voice-options";
import { VoiceOrb } from "./voice-orb";

const ORB = 40;

export function VoiceAndLookRow({ onPress }: { onPress: () => void }) {
	const { voice } = useTalkStyle();
	const muted = useThemeColor("muted");
	const label = TALK_CAST.find((o) => o.value === voice)?.label ?? voice;
	return (
		<PressableFeedback
			accessibilityHint="Opens the voice and look settings"
			accessibilityLabel={`Voice and look, ${label}`}
			accessibilityRole="button"
			className="flex-row items-center gap-3 rounded-2xl bg-surface/60 p-2.5 pr-4"
			onPress={onPress}
			style={{ borderCurve: "continuous" }}
		>
			<VoiceOrb size={ORB} voice={voice} />
			<View className="flex-1">
				<AppText className="font-medium text-foreground text-sm">
					Voice and look
				</AppText>
				<AppText className="text-muted text-xs">{label}</AppText>
			</View>
			<SymbolView
				name={{ android: "chevron_right", ios: "chevron.right" }}
				size={13}
				tintColor={muted}
			/>
		</PressableFeedback>
	);
}
