// The talk as a transcript (#593): the companion on the left under its name,
// the person on the right. A spoken turn from the person carries a waveform tag.
import { useRef, type ReactNode } from "react";
import { Platform, ScrollView, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { COMPANION_NAME } from "./talk-copy";
import type { Turn } from "./use-thread";

function TurnBubble({ turn }: { turn: Turn }) {
  const muted = useThemeColor("muted");
  const mine = turn.speaker === "person";
  return (
    <Animated.View entering={FadeInDown.duration(220)} className={cn("max-w-[85%] gap-1", mine ? "self-end" : "self-start")}>
      <View
        className={cn("rounded-3xl px-4 py-3", mine ? "bg-accent/15" : "bg-surface", turn.live && "opacity-80")}
        style={{ borderCurve: "continuous" }}
      >
        {!mine && <AppText className="mb-1 text-xs font-semibold text-accent">{COMPANION_NAME}</AppText>}
        <AppText className="text-[16px] leading-6 text-foreground">{turn.text || "…"}</AppText>
      </View>
      {mine && turn.via === "voice" && (
        <View className="flex-row items-center gap-1 self-end pr-2">
          <SymbolView name={{ ios: "waveform", android: "graphic_eq" }} size={10} tintColor={muted} />
          <AppText className="text-[11px] text-muted">spoken</AppText>
        </View>
      )}
    </Animated.View>
  );
}

export function TalkThread({ turns, footer }: { turns: Turn[]; footer?: ReactNode }) {
  const ref = useRef<ScrollViewInstance>(null);
  const headerHeight = useHeaderHeight();
  // iOS scrolls under its transparent header; Android's header is solid.
  const top = Platform.OS === "ios" ? headerHeight + 16 : 16;
  return (
    <ScrollView
      ref={ref}
      className="flex-1"
      contentContainerClassName="gap-3 px-4 pb-4"
      contentContainerStyle={{ paddingTop: top }}
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
