import { View } from "react-native";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";

const FILLED = { android: "star", ios: "star.fill" } as const;
const VALUES = [1, 2, 3, 4, 5];
const STAR = 32;

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
						accessibilityLabel={COPY.rate.starA11y(star)}
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
