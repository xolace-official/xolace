import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";

const ARCHIVE_ICON = {
	android: "open_in_new",
	ios: "arrow.up.forward.square",
} as const;

/** The poster's second sheet, on the fixed palette so hero and deck read as one printed set
 * (#305). */
export function DeckCard({
	onOpenArchive,
}: {
	onOpenArchive: () => void;
}) {
	const [ink] = useCSSVariable(["--color-poster-ink"]) as string[];

	return (
		<View className="mt-3">
			<PressableFeedback
				accessibilityLabel="See old quotes"
				accessibilityRole="button"
				onPress={() => {
					Presets.flick();
					onOpenArchive();
				}}
			>
				<GlassSurface
					className="flex-row items-center justify-between px-4 py-3"
					interactive
					radius={18}
				>
					<AppText className="font-poster-display text-[22px] text-poster-ink">
						SEE OLD QUOTES
					</AppText>
					<SymbolView name={ARCHIVE_ICON} size={20} tintColor={ink} />
				</GlassSurface>
			</PressableFeedback>
		</View>
	);
}
