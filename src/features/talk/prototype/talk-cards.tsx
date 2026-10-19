// PROTOTYPE (#584) — throwaway. The two moments either side of a live talk:
// consent (before) and the hand-off to the mirror (after), plus "Say more".
import { View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { COMPANION_NAME } from "./talk-script";
import type { TalkSim } from "./use-talk-sim";

function Row({ icon, children }: { icon: string; children: string }) {
  const accent = useThemeColor("accent");
  return (
    <View className="flex-row gap-3">
      <SymbolView name={icon as never} size={18} tintColor={accent} />
      <AppText className="flex-1 text-sm leading-5 text-foreground">{children}</AppText>
    </View>
  );
}

export function ConsentCard({ sim }: { sim: TalkSim }) {
  return (
    <GlassSurface radius={28}>
      <View className="gap-4 p-5">
        <AppText className="text-xl font-semibold text-foreground">Talk it through with {COMPANION_NAME}</AppText>
        <Row icon="waveform">Speak whenever you like, or type. Both land in the same talk.</Row>
        <Row icon="sparkles">When you finish, the whole talk becomes your mirror, like any reflection.</Row>
        <Row icon="lock">{`${COMPANION_NAME} is an AI, part of Xolace. This talk is remembered with your reflections; you can delete it.`}</Row>
        <Row icon="clock">{`Up to 15 minutes. You have ${sim.weekLeftMin} min of talk time left this week.`}</Row>
        <Button onPress={sim.start} isDisabled={sim.weekLeftMin < 3}>
          <Button.Label>{sim.weekLeftMin < 3 ? "Talk time resets Monday" : "Start talking"}</Button.Label>
        </Button>
        <AppText className="text-center text-xs text-muted">We will ask for the microphone once.</AppText>
      </View>
    </GlassSurface>
  );
}

export function EndedCard({ sim }: { sim: TalkSim }) {
  const canReopen = !sim.reopened && sim.weekLeftMin >= 3;
  return (
    <GlassSurface radius={28}>
      <View className="gap-3 p-5">
        <AppText className="text-lg font-semibold text-foreground">Making your mirror…</AppText>
        <AppText className="text-sm leading-5 text-muted">
          (Prototype: here the screen hands off to the existing processing → mirror screens.)
        </AppText>
        <AppText className="text-sm text-muted">{sim.weekLeftMin} min of talk time left this week.</AppText>
        <Button variant="secondary" onPress={sim.reopen} isDisabled={!canReopen}>
          <Button.Label>{canReopen ? "Say more (from the mirror) · 5 min" : "Say more used"}</Button.Label>
        </Button>
      </View>
    </GlassSurface>
  );
}
