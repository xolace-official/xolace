import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";

type Props = {
  onBegin: () => void;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const HIDDEN_FADE = { opacity: 0 };
const SHOW_TRANSITION = {
  type: "timing",
  duration: 600,
  easing: EASE,
} as const;
const HIDE_TRANSITION = {
  type: "timing",
  duration: 300,
  easing: EASE,
} as const;
const BUTTON_TRANSITION = {
  type: "timing",
  duration: 400,
  delay: 600,
  easing: EASE,
} as const;

export function PreRollCard({ onBegin }: Props) {
  const [visible, setVisible] = useState(true);

  const handleBegin = () => {
    setVisible(false);
  };

  return (
    <EaseView
      initialAnimate={INITIAL_FADE}
      animate={visible ? VISIBLE_FADE : HIDDEN_FADE}
      transition={visible ? SHOW_TRANSITION : HIDE_TRANSITION}
      onTransitionEnd={({ finished }) => {
        if (finished && !visible) onBegin();
      }}
      className="flex-1 items-center justify-center px-8"
    >
      <View className="items-center gap-6">
        <AppText className="text-center text-2xl font-semibold text-foreground">
          Sit with this
        </AppText>
        <AppText className="text-center text-base text-foreground/50">
          This takes about 90 seconds.{"\n"}Stay with it.
        </AppText>
        <EaseView
          initialAnimate={INITIAL_FADE}
          animate={VISIBLE_FADE}
          transition={BUTTON_TRANSITION}
        >
          <PillButton label="Begin" onPress={handleBegin} />
        </EaseView>
      </View>
    </EaseView>
  );
}
