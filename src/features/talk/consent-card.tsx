// The moment before the first word (#593): what a talk is, who the companion
// is, what is kept. The microphone is asked for once, from here.
import { View } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { COMPANION_NAME, PRIVACY_LINE } from "./talk-copy";
import type { Talk } from "./use-talk";

function Row({ icon, children }: { icon: SymbolViewProps["name"]; children: string }) {
  const accent = useThemeColor("accent");
  return (
    <View className="flex-row gap-3">
      <SymbolView name={icon} size={18} tintColor={accent} />
      <AppText className="flex-1 text-sm leading-5 text-foreground">{children}</AppText>
    </View>
  );
}

export function ConsentCard({ talk }: { talk: Talk }) {
  return (
    <GlassSurface radius={28}>
      <View className="gap-4 p-5">
        <AppText className="text-xl font-semibold text-foreground">Talk it through with {COMPANION_NAME}</AppText>
        <Row icon={{ ios: "waveform", android: "graphic_eq" }}>
          Speak whenever you like, or type. Both land in the same talk.
        </Row>
        <Row icon={{ ios: "sparkles", android: "auto_awesome" }}>
          When you finish, the whole talk becomes your mirror, like any reflection.
        </Row>
        <Row icon={{ ios: "flame", android: "local_fire_department" }}>
          {`${COMPANION_NAME} is an AI, part of Xolace. This talk is remembered with your reflections.`}
        </Row>
        <Row icon={{ ios: "clock", android: "schedule" }}>A talk lasts up to 15 minutes.</Row>
        <Row icon={{ ios: "lock", android: "lock" }}>{PRIVACY_LINE}</Row>
        <Button onPress={talk.start} isDisabled={talk.started}>
          <Button.Label>{talk.started ? "Starting…" : "Start talking"}</Button.Label>
        </Button>
        {talk.error ? (
          <AppText className="text-center text-xs text-danger">{talk.error}</AppText>
        ) : (
          <AppText className="text-center text-xs text-muted">We will ask for the microphone once.</AppText>
        )}
      </View>
    </GlassSurface>
  );
}
