// PROTOTYPE (#584) — throwaway. One glass composer, no mode switch: the mic is
// open the whole talk, and typing is just another way in. Layout from the
// react-native-motion chatgpt-attachments composer (side button · field ·
// action), glass from expo-glass-effect via GlassSurface. The live-level bars
// become a send arrow the moment there is text.
// Real build note: Inkigo's @expo/ui SwiftUI TextField gives true native
// growth + glass on iOS 26 but needs @expo/ui (not installed) and a rebuild.
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { InputGroup, useThemeColor } from "heroui-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { playSoftPress } from "@/src/lib/haptics";
import { COMPANION_NAME } from "./talk-script";
import type { TalkSim } from "./use-talk-sim";

// iOS 26 gets the glass field; iOS 18 and Android get HeroUI's InputGroup.
const hasGlass = isLiquidGlassAvailable();
// Android draws Material Symbols, so each glyph needs its Android name.
const ICON = {
  send: { ios: "arrow.up", android: "arrow_upward" },
  mic: { ios: "mic.fill", android: "mic" },
  micOff: { ios: "mic.slash.fill", android: "mic_off" },
} as const;

function LevelBar({ level, i }: { level: SharedValue<number>; i: number }) {
  const shape = [0.5, 0.85, 1, 0.75, 0.45][i];
  const style = useAnimatedStyle(() => ({ height: 4 + 14 * shape * level.get() }));
  return <Animated.View className="w-[3px] rounded-full bg-accent-foreground" style={style} />;
}

/** Live mic level when empty; send when there is text. */
function ActionButton({ sim, text, onSend }: { sim: TalkSim; text: string; onSend: () => void }) {
  const fg = useThemeColor("accent-foreground");
  const hasText = text.trim().length > 0;
  return (
    <Pressable
      // Prototype: tapping the level bars stands in for actually speaking.
      onPress={hasText ? onSend : sim.talk}
      accessibilityLabel={hasText ? "Send" : "Listening. Tap to simulate speaking"}
      className="size-9 items-center justify-center rounded-full bg-accent"
      style={{ opacity: !hasText && !sim.micOn ? 0.4 : 1 }}
    >
      {hasText ? (
        <SymbolView name={ICON.send} size={16} weight="bold" tintColor={fg} />
      ) : (
        <View className="flex-row items-center gap-[2px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <LevelBar key={i} level={sim.level} i={i} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export function TalkComposer({ sim, bare }: { sim: TalkSim; bare?: boolean }) {
  const insets = useSafeAreaInsets();
  const muted = useThemeColor("muted");
  const fg = useThemeColor("foreground");
  const [text, setText] = useState("");
  const placeholder = sim.micOn ? `Speak or message ${COMPANION_NAME}` : `Message ${COMPANION_NAME}`;
  const send = () => {
    playSoftPress();
    sim.send(text);
    setText("");
  };
  return (
    <View className="flex-row items-end gap-2 px-4 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
      <Pressable onPress={sim.toggleMic} accessibilityLabel={sim.micOn ? "Mute mic" : "Unmute mic"}>
        <GlassSurface radius={22} interactive>
          <View className="size-11 items-center justify-center">
            <SymbolView name={sim.micOn ? ICON.mic : ICON.micOff} size={18} tintColor={sim.micOn ? fg : muted} />
          </View>
        </GlassSurface>
      </Pressable>
      <View className="flex-1">
        {hasGlass ? (
          <GlassSurface radius={22} tint={bare ? undefined : "accent"}>
            <View className="min-h-11 flex-row items-end py-1 pl-4 pr-1">
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder={placeholder}
                placeholderTextColor={muted}
                className="max-h-28 flex-1 py-2 text-base text-foreground"
              />
              <ActionButton sim={sim} text={text} onSend={send} />
            </View>
          </GlassSurface>
        ) : (
          <InputGroup>
            <InputGroup.Input
              value={text}
              onChangeText={setText}
              multiline
              placeholder={placeholder}
              textAlignVertical="center"
              className="max-h-28 min-h-11 py-3"
              style={{ borderRadius: 22, borderCurve: "continuous" }}
            />
            <InputGroup.Suffix className="pr-1">
              <ActionButton sim={sim} text={text} onSend={send} />
            </InputGroup.Suffix>
          </InputGroup>
        )}
      </View>
    </View>
  );
}

/** Lifts the thread and the composer together, so the latest line stays in view. */
export function TalkKeyboardFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={8 - insets.bottom} className="flex-1">
      {children}
    </KeyboardAvoidingView>
  );
}
