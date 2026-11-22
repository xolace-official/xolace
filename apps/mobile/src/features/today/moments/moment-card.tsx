import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import {
	getEmotionEmoji,
	getEmotionLabel,
	type MomentView,
} from "./moments-model";

const SPEAKER = 22;
const ACTIVATE = [{ name: "activate" }];

export function MomentCard({
	entry,
	onOpen,
}: {
	entry: MomentView;
	onOpen: () => void;
}) {
	const accent = useTokenColor("accent");
	return (
		<View
			accessibilityActions={ACTIVATE}
			accessibilityHint={COPY.moments.openHint}
			accessibilityLabel={`${getEmotionLabel(entry.emotion)}. ${entry.quote}`}
			accessibilityRole="button"
			accessible
			className="flex-1 justify-between p-4"
			// VoiceOver's and TalkBack's double tap (onAccessibilityTap is iOS-only).
			onAccessibilityAction={(e) => {
				if (e.nativeEvent.actionName === "activate") {
					onOpen();
				}
			}}
		>
			{entry.audio ? (
				<View className="absolute top-3 right-3 size-11 items-center justify-center rounded-full bg-accent-wash">
					<Icon
						color={accent}
						name={{ android: "volume_up", ios: "speaker.wave.2.fill" }}
						size={SPEAKER}
					/>
				</View>
			) : null}
			<AppText
				className={cn("text-[16px] leading-[24px]", entry.audio && "pr-10")}
				italic
				numberOfLines={4}
				variant="subhead"
			>
				“{entry.quote}”
			</AppText>
			<View className="flex-row items-center gap-2">
				<AppText className="text-[16px]" variant="subhead">
					{getEmotionEmoji(entry.emotion)}
				</AppText>
				<AppText
					className="shrink text-[14px] opacity-65"
					numberOfLines={1}
					variant="footnote"
				>
					{getEmotionLabel(entry.emotion)}
				</AppText>
			</View>
		</View>
	);
}
