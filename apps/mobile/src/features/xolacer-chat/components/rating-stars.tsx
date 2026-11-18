import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";

// Empty stars are the same glyph washed out, not an outline.
const FILLED = { android: "star", ios: "star.fill", web: "star" } as const;
const VALUES = [1, 2, 3, 4, 5];

/** Stars use the `warning` token rather than a new `--star` one every theme would have to
 * define. */
function useStarColors() {
	// useThemeColor resolves oklch tokens to 6-digit hex, so appending an alpha
	// pair is a valid colour — that's how the empty star gets its wash.
	const muted = useThemeColor("muted") as string;
	return { off: `${muted}30`, on: useThemeColor("warning") as string };
}

/** The five-star picker on the rating prompt. */
export function RatingPicker({
	value,
	onSelect,
}: {
	value?: number;
	onSelect: (rating: number) => void;
}) {
	const { on, off } = useStarColors();

	return (
		<View className="flex-row justify-center gap-2.5">
			{VALUES.map((star) => {
				const filled = value !== undefined && star <= value;
				return (
					<PressableFeedback
						accessibilityLabel={`Rate ${star} out of 5`}
						accessibilityRole="button"
						accessibilityState={{ selected: filled }}
						hitSlop={8}
						key={star}
						onPress={() => {
							playSoftPress();
							onSelect(star);
						}}
					>
						<SymbolView name={FILLED} size={32} tintColor={filled ? on : off} />
					</PressableFeedback>
				);
			})}
		</View>
	);
}
