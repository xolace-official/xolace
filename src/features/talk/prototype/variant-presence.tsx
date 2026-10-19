// PROTOTYPE (#584) — Variant B, "Presence". Voice-first: a full-screen aurora
// that hangs from the top and answers to the voice, with only the current line
// as large live captions. The transcript is one tap away, not the main thing.
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { TalkAurora } from "./talk-aurora";
import { TalkHeader } from "./talk-header";
import { TalkThread } from "./talk-thread";
import { TalkComposer, TalkKeyboardFrame } from "./talk-composer";
import { ConsentCard, EndedCard } from "./talk-cards";
import type { TalkSim } from "./use-talk-sim";

function Captions({ sim }: { sim: TalkSim }) {
  const last = sim.turns.at(-1);
  const prev = sim.turns.at(-2);
  if (!last) return null;
  return (
    <View className="flex-1 justify-center gap-6 px-7">
      {prev && (
        <AppText className="text-base leading-6 text-muted" numberOfLines={3}>
          {prev.text}
        </AppText>
      )}
      <Animated.View key={last.id} entering={FadeIn.duration(250)}>
        <AppText
          className={
            last.speaker === "companion" ? "text-[26px] leading-9 text-foreground" : "text-[22px] leading-8 text-accent"
          }
        >
          {last.text || "…"}
        </AppText>
      </Animated.View>
    </View>
  );
}

export function VariantPresence({ sim }: { sim: TalkSim }) {
  const [transcript, setTranscript] = useState(false);
  const header = useHeaderHeight();
  const fg = useThemeColor("foreground");
  const body =
    sim.phase === "consent" ? <ConsentCard sim={sim} /> : sim.phase === "ended" ? <EndedCard sim={sim} /> : null;
  return (
    <TalkKeyboardFrame>
      <TalkAurora level={sim.level} />
      <TalkHeader sim={sim} />
      {body ? (
        <View className="flex-1 justify-center px-4">{body}</View>
      ) : transcript ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-1">
          <TalkThread turns={sim.turns} />
        </Animated.View>
      ) : (
        <View className="flex-1" style={{ paddingTop: header }}>
          <Captions sim={sim} />
        </View>
      )}
      {!body && (
        <View className="items-center pb-1">
          <Pressable onPress={() => setTranscript((t) => !t)}>
            <GlassSurface radius={16} interactive>
              <View className="flex-row items-center gap-1.5 px-3 py-1.5">
                <SymbolView name={transcript ? "captions.bubble" : "text.bubble"} size={13} tintColor={fg} />
                <AppText className="text-xs font-medium text-foreground">
                  {transcript ? "Captions" : "Transcript"}
                </AppText>
              </View>
            </GlassSurface>
          </Pressable>
        </View>
      )}
      {sim.phase === "live" && <TalkComposer sim={sim} bare />}
    </TalkKeyboardFrame>
  );
}
