import { Radio, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { CrossPlatformSymbol } from "@/src/features/settings/components/settings-icons";

type Props = {
  symbol: CrossPlatformSymbol;
  isSelected: boolean;
};

/**
 * A radio indicator that reveals an icon when its option is selected.
 *
 * When a HeroUI Radio is selected, the indicator fills with the `accent`
 * color, so the symbol sitting on top uses `accent-foreground` (the contrast
 * color) to stay legible.
 */
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
              weight="bold"
              tintColor={accentForeground}
            />
          </Animated.View>
        )}
      </Radio.Indicator>
    </Radio>
  );
};
