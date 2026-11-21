import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";

export function Chips({
	options,
	value,
	onPress,
	label,
}: {
	options: readonly string[];
	value: string | null;
	onPress: (option: string) => void;
	label: string;
}) {
	return (
		<View
			accessibilityLabel={label}
			accessibilityRole="radiogroup"
			className="flex-row flex-wrap gap-2"
		>
			{options.map((option) => {
				const chosen = option === value;
				return (
					<PressScale
						accessibilityLabel={option}
						accessibilityRole="radio"
						accessibilityState={{ checked: chosen }}
						className={cn(
							"h-10 justify-center rounded-full border px-4",
							chosen
								? "border-accent bg-accent-wash"
								: "border-separator bg-surface"
						)}
						haptic={Presets.System.selection}
						key={option}
						onPress={() => onPress(option)}
					>
						<AppText
							color={chosen ? "accentInk" : "muted"}
							variant="callout"
							weight={chosen ? "semibold" : "regular"}
						>
							{option}
						</AppText>
					</PressScale>
				);
			})}
		</View>
	);
}
