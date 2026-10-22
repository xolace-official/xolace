import { SymbolView } from "expo-symbols";
import { PropsWithChildren, useState } from "react";
import { Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";

import { AppText } from "@/src/components/shared/app-text";

const CONTENT_INITIAL_ANIMATE = { opacity: 0 };
const CONTENT_ANIMATE = { opacity: 1 };
const CONTENT_EASING: [number, number, number, number] = [
  0.455, 0.03, 0.515, 0.955,
];
const CHEVRON_NAME = {
  ios: "chevron.right",
  android: "chevron_right",
  web: "chevron_right",
} as const;

export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const chevronStyle = { transform: [{ rotate: isOpen ? "-90deg" : "90deg" }] };
  const chevronName = CHEVRON_NAME;
  const transition = { type: "timing" as const, duration: 200, easing: CONTENT_EASING };

  return (
    <View>
      <Pressable
        className="flex-row items-center gap-2 active:opacity-70"
        onPress={() => setIsOpen((value) => !value)}
      >
        <View className="w-6 h-6 rounded-xl justify-center items-center bg-background-element">
          <SymbolView
            name={chevronName}
            size={14}
            weight="bold"
            tintColor="var(--text)"
            style={chevronStyle}
          />
        </View>

        <AppText className="text-sm font-medium text-foreground">
          {title}
        </AppText>
      </Pressable>
      {isOpen && (
        <EaseView
          initialAnimate={CONTENT_INITIAL_ANIMATE}
          animate={CONTENT_ANIMATE}
          transition={transition}
        >
          <View className="mt-4 rounded-2xl ml-6 p-6 bg-background-element">
            {children}
          </View>
        </EaseView>
      )}
    </View>
  );
}
