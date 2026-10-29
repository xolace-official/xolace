import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";

const ARCHIVE_ICON_NAME = {
	android: "archive",
	ios: "archivebox",
	web: "archive",
} as const;

/** The way into the Archived screen, shaped like a conversation row so it reads as part of the
 * list. */
export function ArchivedEntryRow({
	count,
	showSeparator,
}: {
	count: number;
	/** Omitted when no conversations follow. */
	showSeparator: boolean;
}) {
	const router = useRouter();
	const tintColor = useThemeColor("muted") as string;

	return (
		<PressableFeedback
			accessibilityLabel={`Archived, ${count} ${count === 1 ? "conversation" : "conversations"}`}
			accessibilityRole="button"
			onPress={() => {
				playSoftPress();
				router.push("/connect/archived");
			}}
		>
			<View className="px-4">
				<View className="flex-row items-center gap-3 py-3">
					<View className="size-11 items-center justify-center rounded-full bg-surface-secondary">
						<SymbolView
							name={ARCHIVE_ICON_NAME}
							size={20}
							tintColor={tintColor}
						/>
					</View>
					<View className="flex-1 flex-row items-center">
						<AppText className="flex-1 font-semibold text-foreground text-sm">
							Archived
						</AppText>
						<AppText className="text-[13px] text-muted">{count}</AppText>
					</View>
				</View>
				{/* Inset to the text column: avatar (44) + gap (12), like the rows below. */}
				{showSeparator && <View className="ml-14 h-px bg-border/40" />}
			</View>
		</PressableFeedback>
	);
}
