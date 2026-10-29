import { type SFSymbol, SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { removeEmDash } from "@/features/quotes/utils/text-utils";
import { getEmotionEmoji, getEmotionLabel } from "@/features/timeline/emotions";
import type { TimelineEntry } from "@/features/timeline/types";

const SPEAKER_ICON: { ios: SFSymbol; android: string; web: string } = {
	android: "volume_up",
	ios: "speaker.wave.2.fill",
	web: "volume_up",
};

type Props = {
	entry: TimelineEntry;
};

/** Presentational only: the carousel wrapper is pointerEvents:"none" and `onCardPress` handles
 * the tap. */
export function DiscoveryMomentCard({ entry }: Props) {
	const accentColor = useThemeColor("accent");
	const emoji = getEmotionEmoji(entry.granularLabel ?? entry.primaryEmotion);
	const emotionLabel = getEmotionLabel(
		entry.granularLabel ?? entry.primaryEmotion
	);
	const hasAudio = entry.hasMirrorAudio;

	return (
		<View className="flex-1 justify-between p-4">
			{hasAudio ? (
				<View
					accessibilityElementsHidden
					className="absolute top-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-accent-foreground"
					importantForAccessibility="no-hide-descendants"
				>
					<SymbolView
						name={SPEAKER_ICON as any}
						size={22}
						tintColor={accentColor as string}
					/>
				</View>
			) : null}

			<AppText
				className={`text-base text-foreground italic leading-6 ${hasAudio ? "pr-10" : ""}`}
				numberOfLines={4}
			>
				&ldquo;{removeEmDash(entry.mirrorText)}&rdquo;
			</AppText>

			<View className="flex-row items-center gap-2">
				<AppText className="text-base">{emoji}</AppText>
				<AppText
					className="shrink text-foreground/65 text-sm"
					numberOfLines={1}
				>
					{emotionLabel}
				</AppText>
			</View>
		</View>
	);
}
