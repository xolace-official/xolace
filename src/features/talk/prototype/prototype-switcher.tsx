// PROTOTYPE (#584) — throwaway. Floating dev bar: cycle variants, jump the
// talk's clock. Deliberately loud so nobody mistakes it for the design.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/shared/app-text";
import type { TalkSim } from "./use-talk-sim";

type Props = { variants: Record<string, string>; current: string; sim: TalkSim };

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} className="rounded-full bg-black/60 px-2.5 py-1">
      <AppText className="text-[11px] font-semibold text-white">{label}</AppText>
    </Pressable>
  );
}

export function PrototypeSwitcher({ variants, current, sim }: Props) {
  const insets = useSafeAreaInsets();
  if (process.env.NODE_ENV === "production") return null;
  const keys = Object.keys(variants);
  const i = keys.indexOf(current);
  const go = (d: number) => router.setParams({ variant: keys[(i + d + keys.length) % keys.length] });
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 56, left: 0, right: 0, alignItems: "center" }}
    >
      <View className="flex-row items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-400/90 px-2 py-1.5">
        <Chip label="◀" onPress={() => go(-1)} />
        <AppText className="px-1 text-xs font-bold text-black">
          {current} · {variants[current]}
        </AppText>
        <Chip label="▶" onPress={() => go(1)} />
        <Chip label="5m" onPress={sim.jumpToWrap} />
        <Chip label="end" onPress={sim.jumpToEnd} />
        <Chip label="low wk" onPress={sim.lowWeek} />
        <Chip label="↺" onPress={sim.reset} />
      </View>
    </View>
  );
}
