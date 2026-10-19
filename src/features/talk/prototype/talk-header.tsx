// PROTOTYPE (#584) — throwaway. Native stack header: the system's glass back
// button, a glass title pill (who + what they're doing), and a native menu.
// The clock stays out of sight until the last five minutes.
import { View } from "react-native";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { COMPANION_NAME } from "./talk-script";
import { mmss, type TalkSim } from "./use-talk-sim";

const PRESENCE = { listening: "Listening", thinking: "Thinking…", speaking: "Speaking", idle: "" } as const;

export function statusLine(sim: TalkSim) {
  if (sim.phase === "consent") return "Xolace+ · voice";
  if (sim.phase === "ending") return "Wrapping up";
  if (sim.phase === "ended") return "Talk ended";
  const p = sim.presence === "listening" && !sim.micOn ? "Mic off" : PRESENCE[sim.presence];
  return sim.remaining <= 300 ? `${p} · ${mmss(sim.remaining)} left` : p;
}

function TitlePill({ sim }: { sim: TalkSim }) {
  const accent = useThemeColor("accent");
  const warn = useThemeColor("warning");
  const late = sim.phase === "live" && sim.remaining <= 300;
  return (
    <GlassSurface radius={22}>
      <View className="flex-row items-center gap-2 py-1.5 pl-1.5 pr-4">
        <View className="size-8 items-center justify-center rounded-full bg-accent/20">
          <SymbolView name="flame.fill" size={16} tintColor={accent} />
        </View>
        <View>
          <AppText className="text-[15px] font-semibold text-foreground">{COMPANION_NAME}</AppText>
          <AppText className="text-[11px] text-muted" style={late ? { color: warn } : undefined}>
            {statusLine(sim) || " "}
          </AppText>
        </View>
      </View>
    </GlassSurface>
  );
}

export function TalkHeader({ sim }: { sim: TalkSim }) {
  const live = sim.phase === "live";
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
          scrollEdgeEffects: { top: "soft" },
          headerBackButtonDisplayMode: "minimal",
          title: COMPANION_NAME,
          // eslint-disable-next-line react/no-unstable-nested-components -- header render prop
          headerTitle: () => <TitlePill sim={sim} />,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction icon="clock" disabled>
            {/* Whole minutes: a label that changes every second rebuilds the native
                menu and closes it while it is open. */}
            {`${Math.ceil(sim.remaining / 60)} min left in this talk · ${sim.weekLeftMin} min this week`}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon={sim.micOn ? "mic.slash" : "mic"} onPress={sim.toggleMic}>
            {sim.micOn ? "Mute mic" : "Unmute mic"}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="lifepreserver" onPress={() => {}}>
            Get help now
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="sparkles" disabled={!live} onPress={sim.end}>
            End and make my mirror
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
