// PROTOTYPE (#584) — throwaway route. Three talk-screen variants switchable
// via ?variant=A|B|C. Open with: xolace://talk-prototype?variant=A
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useTalkSim } from "@/src/features/talk/prototype/use-talk-sim";
import { PrototypeSwitcher } from "@/src/features/talk/prototype/prototype-switcher";
import { VariantThread } from "@/src/features/talk/prototype/variant-thread";
import { VariantPresence } from "@/src/features/talk/prototype/variant-presence";
import { VariantHearth } from "@/src/features/talk/prototype/variant-hearth";

const VARIANTS = { A: "Thread", B: "Presence", C: "Hearth" };

export default function TalkPrototypeRoute() {
  const { variant = "A" } = useLocalSearchParams<{ variant?: string }>();
  const sim = useTalkSim();
  return (
    <View className="flex-1 bg-background">
      {variant === "A" && <VariantThread sim={sim} />}
      {variant === "B" && <VariantPresence sim={sim} />}
      {variant === "C" && <VariantHearth sim={sim} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} sim={sim} />
    </View>
  );
}
