import { View } from "react-native";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";

// Empty stars are the same glyph washed out, not an outline.
const FILLED = { android: "star", ios: "star.fill" } as const;
const VALUES = [1, 2, 3, 4, 5];
const STAR = 32;

/** The five-star picker on the rating prompt. Stars use the `warning` token rather than a new
 * `--star` one every theme would have to define. */
export function RatingPicker({
	value,
	onSelect,
}: {
	value?: number;
	onSelect: (rating: number) => void;
}) {
	const [on, off] = useTokenColors(["warning", "muted"]);
	return (
		<View className="flex-row justify-center gap-2.5">
			{VALUES.map((star) => {
				const filled = value !== undefined && star <= value;
				return (
					<PressScale
						accessibilityLabel={`Rate ${star} out of 5`}
						accessibilityState={{ selected: filled }}
						className={filled ? "opacity-100" : "opacity-30"}
						haptic={playSoftPress}
						hitSlop={8}
						key={star}
						onPress={() => onSelect(star)}
					>
						<Icon color={filled ? on : off} name={FILLED} size={STAR} />
					</PressScale>
				);
			})}
		</View>
	);
}
