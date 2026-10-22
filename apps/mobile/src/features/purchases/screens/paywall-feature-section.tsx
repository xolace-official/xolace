import { View } from "react-native";
import { Separator, Surface } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import type { ReactElement } from "react";
import type { PaywallFeatureId } from "./paywall-surface-map";

type Props = {
  title: string;
  children: ReactElement<{ id: PaywallFeatureId }>[];
};

/**
 * One titled group of feature rows inside the paywall, e.g. "New Level
 * Unlocked". Reinterprets the raycast sample's neutral BlurView card as a
 * themed HeroUI Surface, with Separator between rows instead of a hairline.
 */
export function PaywallFeatureSection({ title, children }: Props) {
  return (
    <View className="gap-3">
      <AppText className="text-lg font-semibold text-foreground text-center">{title}</AppText>
      <Surface variant="secondary" className="gap-4">
        {children.map((child, index) => (
          <View key={child.props.id}>
            {index > 0 && <Separator className="mb-4" />}
            {child}
          </View>
        ))}
      </Surface>
    </View>
  );
}
