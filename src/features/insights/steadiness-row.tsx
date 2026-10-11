// The profile's door into the insights screen (#517).
import { View } from "react-native";
import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { playSoftPress } from "@/src/lib/haptics";
import { GAUGE, icon } from "@/src/features/insights/domains";

const CHEVRON = icon("chevron.right", "chevron_right");

export function SteadinessRow() {
  const router = useRouter();
  const [accent, muted] = [useTokenColor("accent"), useTokenColor("muted")];
  return (
    <PressableFeedback
      onPress={() => {
        playSoftPress();
        router.push("/profile/insights");
      }}
      accessibilityRole="button"
      accessibilityLabel="Steadiness. How the parts of your life have been lately."
      className="mx-5 mb-4 flex-row items-center gap-3 rounded-3xl bg-surface border border-border/65 px-5 py-4"
    >
      <View className="size-9 items-center justify-center rounded-xl bg-accent/12">
        <SymbolView name={GAUGE} size={17} tintColor={accent} />
      </View>
      <View className="flex-1">
        <AppText className="text-[15px] font-medium text-foreground">Steadiness</AppText>
        <AppText className="text-[13px] leading-5 text-muted">How the parts of your life have been lately.</AppText>
      </View>
      <SymbolView name={CHEVRON} size={13} tintColor={muted} />
    </PressableFeedback>
  );
}
