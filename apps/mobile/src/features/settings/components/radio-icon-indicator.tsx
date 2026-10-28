import { SymbolView } from "expo-symbols";
import { Radio, useThemeColor } from "heroui-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { CrossPlatformSymbol } from "@/lib/cross-platform-symbol";

type Props = {
	symbol: CrossPlatformSymbol;
	isSelected: boolean;
};

/** Radio indicator that reveals an icon when selected. The selected fill is
 * `accent`, so the symbol uses `accent-foreground` to stay legible. */
export const RadioIconIndicator = ({ symbol, isSelected }: Props) => {
	const accentForeground = useThemeColor("accent-foreground") as string;

	return (
		<Radio>
			<Radio.Indicator>
				{isSelected && (
					<Animated.View entering={ZoomIn.springify().damping(40)}>
						<SymbolView
							name={symbol}
							size={14}
							tintColor={accentForeground}
							weight="bold"
						/>
					</Animated.View>
				)}
			</Radio.Indicator>
		</Radio>
	);
};
