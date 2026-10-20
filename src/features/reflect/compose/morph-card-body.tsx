import type { TextInputInstance } from 'react-native';
import type { RefObject } from "react";
import { TextInput, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { Presets } from "react-native-pulsar";
import { useThemeColor } from "heroui-native";
import { PillButton } from "@/src/components/shared/pill-button";
import { a11yHidden } from "@/src/lib/utils";
import { DictationStrip } from "@/src/features/reflect/compose/dictation-strip";
import type { PlusDictationView } from "@/src/features/reflect/hooks/use-plus-dictation";

// Mirror of MAX_RAW_INPUT in convex/sessions.ts. The input simply stops
// accepting past this, so a user never hits the server's anti-tamper throw.
// No visible counter: a live count under an emotional freeform field reads as
// "your feelings must fit," and ~800 words is unreachable in normal use.
const MAX_RAW_INPUT = 5_000;

type Props = {
  expanded: boolean;
  entryText: string;
  isRecording: boolean;
  /** Null unless the person dictates with Plus. */
  plusDictation: PlusDictationView | null;
  inputRef: RefObject<TextInputInstance | null>;
  style: AnimatedStyle<ViewStyle>;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};

/** What the card holds once it is the composer: the field and its way out. */
export const MorphCardBody = ({
  expanded,
  entryText,
  isRecording,
  plusDictation,
  inputRef,
  style,
  onChangeText,
  onSubmit,
}: Props) => {
  const muted = useThemeColor("muted") as string;

  return (
    <Animated.View
      style={[{ flex: 1 }, style]}
      pointerEvents={expanded ? "auto" : "none"}
      {...a11yHidden(!expanded)}
    >
      <TextInput
        ref={inputRef}
        multiline
        maxLength={MAX_RAW_INPUT}
        placeholder={isRecording ? "I'm listening..." : "Start typing..."}
        placeholderTextColor={muted}
        value={entryText}
        onChangeText={onChangeText}
        style={{ textAlignVertical: "top" }}
        className="flex-1 pt-4 text-lg text-foreground"
      />

      {plusDictation && <DictationStrip {...plusDictation} />}

      <View className="items-center pt-2">
        <PillButton
          label="Let it out"
          onPress={() => {
            Presets.propel();
            onSubmit();
          }}
          // Sending mid-take would drop the words still being written down.
          disabled={
            entryText.trim().length === 0 ||
            plusDictation?.phase === "listening" ||
            plusDictation?.phase === "writing"
          }
        />
      </View>
    </Animated.View>
  );
};
