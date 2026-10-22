import { useRef, useState } from "react";
import { EaseView } from "react-native-ease/uniwind";
import { TextArea, TextField } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

// Input never leaves the device. It is never stored, logged, or sent.
type Props = {
  content: string;
  placeholder?: string;
  onComplete: () => void;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const CONTENT_TRANSITION = {
  type: "timing",
  duration: 500,
  easing: EASE,
} as const;

export function PrivatePromptBeat({ content, placeholder, onComplete }: Props) {
  const [text, setText] = useState("");
  const clearedRef = useRef(false);

  const handleDone = () => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    // Clear before advancing to ensure text is not held in memory.
    setText("");
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={10}
      className="flex-1 w-full items-center justify-center"
    >
      <EaseView
        initialAnimate={INITIAL_FADE}
        animate={VISIBLE_FADE}
        transition={CONTENT_TRANSITION}
        className="w-full items-center gap-6 px-8"
      >
        <AppText className="text-center text-xl font-medium leading-relaxed text-foreground">
          {content}
        </AppText>

        <TextField className="w-full">
          <TextArea
            value={text}
            onChangeText={setText}
            placeholder={placeholder ?? "Write what needs to be said..."}
            autoFocus
          />
        </TextField>

        <AppText className="text-center text-xs text-foreground/40">
          This stays on your phone.
        </AppText>

        <PillButton label="Done" onPress={handleDone} />
      </EaseView>
    </KeyboardAvoidingView>
  );
}
