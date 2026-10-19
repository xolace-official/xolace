// PROTOTYPE (#584) — throwaway. The talk as a transcript: spoken and typed
// turns in one thread, so switching between them never needs a mode.
import { useRef } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { COMPANION_NAME } from "./talk-script";
import type { Turn } from "./use-talk-sim";

export function TurnBubble({ turn }: { turn: Turn }) {
  const muted = useThemeColor("muted");
  const mine = turn.speaker === "person";
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      className={cn("max-w-[85%] gap-1", mine ? "self-end" : "self-start")}
    >
      <View
        className={cn("rounded-3xl px-4 py-3", mine ? "bg-accent/15" : "bg-surface", turn.live && "opacity-70")}
        style={{ borderCurve: "continuous" }}
      >
        {!mine && <AppText className="mb-1 text-xs font-semibold text-accent">{COMPANION_NAME}</AppText>}
        <AppText className="text-[16px] leading-6 text-foreground">{turn.text || "…"}</AppText>
      </View>
      {mine && turn.via === "voice" && (
        <View className="flex-row items-center gap-1 self-end pr-2">
          <SymbolView name="waveform" size={10} tintColor={muted} />
          <AppText className="text-[11px] text-muted">{turn.live ? "hearing you…" : "spoken"}</AppText>
        </View>
      )}
    </Animated.View>
  );
}

export function TalkThread({ turns, footer }: { turns: Turn[]; footer?: React.ReactNode }) {
  const ref = useRef<ScrollView>(null);
  const headerHeight = useHeaderHeight();
  return (
    <ScrollView
      ref={ref}
      className="flex-1"
      contentContainerClassName="gap-3 px-4 pb-4"
      contentContainerStyle={{ paddingTop: headerHeight + 48 }}
      keyboardDismissMode="interactive"
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
    >
      {turns.map((t) => (
        <TurnBubble key={t.id} turn={t} />
      ))}
      {footer}
    </ScrollView>
  );
}
