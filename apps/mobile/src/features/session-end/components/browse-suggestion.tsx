import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { BrowseFamily } from "@/features/session-end/coping-suggestion";
import { playSoftPress } from "@/lib/haptics";

const COPY: Record<
	BrowseFamily,
	{ title: string; body: string; icon: SymbolViewProps["name"] }
> = {
	music: {
		body: "Somewhere else for your head to go. Tap to listen.",
		icon: { android: "music_note", ios: "music.note", web: "music_note" },
		title: "Music to get lost in",
	},
	support: {
		body: "Sounds made for after a session. Tap to listen.",
		icon: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" },
		title: "Something soft to listen to",
	},
};

/** The Browse shelf a coping answer points at (#712), shaped like the Kindling card it
 * stands in for. */
export function BrowseSuggestion({
	family,
	onPress,
}: {
	family: BrowseFamily;
	onPress: () => void;
}) {
	const accent = useThemeColor("accent") as string;
	const { title, body, icon } = COPY[family];

	return (
		<PressableFeedback
			accessibilityLabel={`${title}. Opens Browse.`}
			accessibilityRole="button"
			className="w-full flex-row items-center gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-5 py-4"
			onPress={() => {
				playSoftPress();
				onPress();
			}}
		>
			<View className="h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/12">
				<SymbolView name={icon} size={22} tintColor={accent} />
			</View>
			<View className="flex-1">
				<AppText className="font-medium text-base text-foreground">
					{title}
				</AppText>
				<AppText className="mt-0.5 font-light text-foreground/55 text-xs">
					{body}
				</AppText>
			</View>
			<SymbolView
				name={{
					android: "chevron_right",
					ios: "chevron.right",
					web: "chevron_right",
				}}
				size={16}
				tintColor={accent}
			/>
		</PressableFeedback>
	);
}
