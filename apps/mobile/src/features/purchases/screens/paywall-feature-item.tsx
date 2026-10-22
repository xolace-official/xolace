import { StyleSheet, View } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Chip, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import type { PaywallFeatureId } from "./paywall-surface-map";

type Props = {
  id: PaywallFeatureId;
  icon: SymbolViewProps["name"];
  title: string;
  description?: string;
  isHighlighted: boolean;
};

export function PaywallFeatureItem({ icon, title, description, isHighlighted }: Props) {
  const accentColor = useThemeColor("accent") as string;

  return (
    <View
      className={cn(
        "flex-row gap-3 rounded-2xl p-2 -m-2",
        isHighlighted && "border border-accent/40 bg-accent/10",
      )}
      style={styles.borderCurve}
    >
      <View
        className="self-start mt-0.5 rounded-[10px] p-2 bg-accent/12"
        style={styles.borderCurve}
      >
        <SymbolView name={icon} size={16} tintColor={accentColor} />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <AppText
            className="text-[15px] font-medium text-foreground shrink"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </AppText>
          {isHighlighted && (
            <Chip size="sm" color="accent" className="shrink-0">
              <Chip.Label>This unlocks it</Chip.Label>
            </Chip>
          )}
        </View>
        {description && (
          <AppText className="text-[13px] leading-5 text-muted">{description}</AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  borderCurve: { borderCurve: "continuous" },
});
