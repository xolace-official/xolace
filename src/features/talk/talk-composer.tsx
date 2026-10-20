// The talk's composer (#593): [mic mute] [field] [action]. The mic is open the
// whole talk and typing is just another way in. The action shows the live mic
// level while the field is empty and becomes send once there is text. Glass on
// iOS 26; HeroUI's InputGroup on older iOS and Android.
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { InputGroup, useThemeColor } from "heroui-native";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { playSoftPress } from "@/src/lib/haptics";
import { cn } from "@/src/lib/utils";
import { COMPANION_NAME } from "./talk-copy";
import type { Talk } from "./use-talk";

const hasGlass = isLiquidGlassAvailable();
const BAR_SHAPE = [0.5, 0.85, 1, 0.75, 0.45];

function LevelBar({ level, shape }: { level: SharedValue<number>; shape: number }) {
  const style = useAnimatedStyle(() => ({ height: 4 + 14 * shape * level.get() }));
  return <Animated.View className="w-[3px] rounded-full bg-accent-foreground" style={style} />;
}

function ActionButton({ talk, hasText, onSend }: { talk: Talk; hasText: boolean; onSend: () => void }) {
  const fg = useThemeColor("accent-foreground");
  if (hasText) {
    return (
      <Pressable onPress={onSend} accessibilityRole="button" accessibilityLabel="Send" className="size-9 items-center justify-center rounded-full bg-accent">
        <SymbolView name={{ ios: "arrow.up", android: "arrow_upward" }} size={16} weight="bold" tintColor={fg} />
      </Pressable>
    );
  }
  return (
    <View
      accessibilityLabel={talk.isMuted ? "Mic off" : "Listening"}
      className={cn("size-9 flex-row items-center justify-center gap-[2px] rounded-full bg-accent", talk.isMuted && "opacity-40")}
    >
      {BAR_SHAPE.map((shape) => (
        <LevelBar key={shape} level={talk.micLevel} shape={shape} />
      ))}
    </View>
  );
}

export function TalkComposer({ talk }: { talk: Talk }) {
  const insets = useSafeAreaInsets();
  const muted = useThemeColor("muted");
  const fg = useThemeColor("foreground");
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;
  const send = () => {
    playSoftPress();
    talk.send(text);
    setText("");
  };
  const action = <ActionButton talk={talk} hasText={hasText} onSend={send} />;
  return (
    <View className="flex-row items-end gap-2 px-4 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
      <Pressable onPress={talk.toggleMic} accessibilityRole="button" accessibilityLabel={talk.isMuted ? "Unmute mic" : "Mute mic"}>
        <GlassSurface radius={22} interactive>
          <View className="size-11 items-center justify-center">
            <SymbolView
              name={talk.isMuted ? { ios: "mic.slash.fill", android: "mic_off" } : { ios: "mic.fill", android: "mic" }}
              size={18}
              tintColor={talk.isMuted ? muted : fg}
            />
          </View>
        </GlassSurface>
      </Pressable>
      <View className="flex-1">
        {hasGlass ? (
          <GlassSurface radius={22} tint="accent">
            <View className="min-h-11 flex-row items-end py-1 pl-4 pr-1">
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder={`Speak or message ${COMPANION_NAME}`}
                placeholderTextColor={muted}
                className="max-h-28 flex-1 py-2 text-base text-foreground"
              />
              {action}
            </View>
          </GlassSurface>
        ) : (
          <InputGroup>
            <InputGroup.Input
              value={text}
              onChangeText={setText}
              multiline
              placeholder={`Speak or message ${COMPANION_NAME}`}
              textAlignVertical="center"
              className="max-h-28 min-h-11 py-3"
              style={{ borderRadius: 22, borderCurve: "continuous" }}
            />
            <InputGroup.Suffix className="pr-1">{action}</InputGroup.Suffix>
          </InputGroup>
        )}
      </View>
    </View>
  );
}
