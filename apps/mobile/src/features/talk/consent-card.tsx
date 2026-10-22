// The moment before the first word (#593): what a talk is, who the companion
// is, what is kept. The microphone is asked for once, from here.
import { View } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { useCompanionName } from "@/src/features/talk/use-companion-name";
import { MIN_TALK_S, PRIVACY_LINE, TALK_TIME_RESETS, talkTimeLine } from "@/src/features/talk/talk-copy";
import type { Talk } from "@/src/features/talk/use-talk";
import { useTalkTime } from "@/src/features/talk/use-talk-time";
import { TalkVoicePicker } from "@/src/features/talk/talk-voice-picker";

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
  const name = useCompanionName();
  const time = useTalkTime();
  // Under the minimum, Start can't be pressed (#582); the server refuses it too.
  const low = time != null && time.secondsLeft < MIN_TALK_S;
  const label = low ? TALK_TIME_RESETS : talk.started ? "Starting…" : "Start talking";
  return (
    <GlassSurface radius={28}>
      <View className="gap-4 p-5">
        <AppText className="text-xl font-semibold text-foreground">Talk it through with {name}</AppText>
        <Row icon={{ ios: "waveform", android: "graphic_eq" }}>
          Speak whenever you like, or type. Both land in the same talk.
        </Row>
        <Row icon={{ ios: "sparkles", android: "auto_awesome" }}>
          When you finish, the whole talk becomes your mirror, like any reflection.
        </Row>
        <Row icon={{ ios: "flame", android: "local_fire_department" }}>
          {`${name} is an AI, part of Xolace. This talk is remembered with your reflections.`}
        </Row>
        <Row icon={{ ios: "clock", android: "schedule" }}>
          {(time && talkTimeLine(time.secondsLeft)) ?? "A talk lasts up to 15 minutes."}
        </Row>
        <Row icon={{ ios: "lock", android: "lock" }}>{PRIVACY_LINE}</Row>
        <View className="gap-2">
          <AppText className="text-xs font-medium text-muted">{`${name}'s voice`}</AppText>
          <TalkVoicePicker />
        </View>
        <Button onPress={talk.start} isDisabled={talk.started || low}>
          <Button.Label>{label}</Button.Label>
        </Button>
        {talk.error ? (
          <AppText className="text-center text-xs text-danger">{talk.error}</AppText>
        ) : (
          <AppText className="text-center text-xs text-muted">
            {low ? "You can still write a reflection any time." : "We will ask for the microphone once."}
          </AppText>
        )}
      </View>
    </GlassSurface>
  );
}
