import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Slider } from "heroui-native";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { AppText } from "@/src/components/shared/app-text";

export function usePlayerInk() {
  return String(useCSSVariable("--color-player-ink"));
}

/** Secondary (speaker) glyphs — `text-player-ink/60`'s twin for a tintColor. */
const DIM = { opacity: 0.6 };

export function GlyphButton({
  name,
  size,
  label,
  onPress,
}: {
  name: SymbolViewProps["name"];
  size: number;
  label: string;
  onPress: () => void;
}) {
  const ink = usePlayerInk();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="items-center justify-center active:opacity-50"
      style={{ width: size + 20, height: size + 20 }}
    >
      <SymbolView name={name} size={size} tintColor={ink} />
    </Pressable>
  );
}

export function VolumeRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ink = usePlayerInk();
  return (
    <View className="w-full flex-row items-center gap-3">
      <SymbolView name={{ ios: "speaker.fill", android: "volume_mute", web: "volume_mute" }} size={13} tintColor={ink} style={DIM} />
      <Slider
        value={value}
        onChange={(v) => onChange(typeof v === "number" ? v : v[0])}
        minValue={0}
        maxValue={1}
        step={0.01}
        className="flex-1"
        accessibilityLabel="Volume"
      >
        <Slider.Track className="h-1.25 rounded-full bg-player-ink/25">
          <Slider.Fill className="rounded-full bg-player-ink" />
          <Slider.Thumb className="h-4 w-4 bg-player-ink" />
        </Slider.Track>
      </Slider>
      <SymbolView name={{ ios: "speaker.wave.3.fill", android: "volume_up", web: "volume_up" }} size={13} tintColor={ink} style={DIM} />
    </View>
  );
}

/** Tier-4 tracks only: a quiet line, never a sheet (§9.4 "never auto-presented"). */
export function CrisisLine() {
  return (
    <Pressable
      onPress={() => router.push("/crisis-resources")}
      hitSlop={8}
      accessibilityRole="link"
      className="items-center active:opacity-50"
    >
      <AppText className="text-[13px] text-player-ink/60">
        If this is heavy right now —{" "}
        <AppText className="text-[13px] text-player-ink/90 underline">someone to talk to</AppText>
      </AppText>
    </Pressable>
  );
}
