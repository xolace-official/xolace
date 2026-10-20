// The talk as a transcript (#593): the companion on the left under its name,
// the person on the right. A spoken turn from the person carries a waveform tag.
// On the timeline, the same thread sits read-only under its mirror (#604).
import { useRef, type ReactNode } from "react";
import { Platform, ScrollView, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { useCompanionName } from "./use-companion-name";
import type { Turn } from "./use-thread";

function TurnBubble({ turn, name: named }: { turn: Turn; name?: string }) {
  const current = useCompanionName();
  const name = named ?? current;
  const muted = useThemeColor("muted");
  const mine = turn.speaker === "person";
  return (
    <Animated.View entering={FadeInDown.duration(220)} className={cn("max-w-[85%] gap-1", mine ? "self-end" : "self-start")}>
      <View
        className={cn("rounded-3xl px-4 py-3", mine ? "bg-accent/15" : "bg-surface", turn.live && "opacity-80")}
        style={{ borderCurve: "continuous" }}
      >
        {!mine && <AppText className="mb-1 text-xs font-semibold text-accent">{name}</AppText>}
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

/** A past talk's thread, as it was: the companion under the name it had then. */
export function TalkTranscript({ sessionId, name }: { sessionId: Id<"sessions">; name?: string }) {
  const lines = useQuery(api.talk.turns.thread, { sessionId });
  if (!lines?.length) return null;
  return (
    <View className="gap-3">
      {lines.map((l, i) => (
        <TurnBubble key={i} turn={{ id: i, speaker: l.role, via: "text", text: l.text }} name={name} />
      ))}
    </View>
  );
}
