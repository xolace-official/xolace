// The talk's native header (#593): the system back button, a glass title pill
// (flame · name · what the companion is doing) and a native ⋯ menu.
import { Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import MoreVert from "@expo/material-symbols/more_vert.xml";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { useAppTheme } from "@/src/context/app-theme-context";
import { useCompanionName } from "@/src/features/talk/use-companion-name";
import type { Talk } from "@/src/features/talk/use-talk";
import { useTimeLeft } from "@/src/features/talk/use-time-left";

const ios = Platform.OS === "ios";
// Only iOS 26 paints glass behind a transparent header; older iOS gets a blur.
const hasGlass = isLiquidGlassAvailable();

const clockOf = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function TitlePill({ talk }: { talk: Talk }) {
  const name = useCompanionName();
  const accent = useThemeColor("accent");
  const secondsLeft = useTimeLeft(talk.connected ? talk.endsAt : null, 1000);
  // The clock shows only from the spoken wrap-up cue (#584).
  const late = secondsLeft !== null && secondsLeft <= talk.clockFromS;
  return (
    <GlassSurface radius={22}>
      <View className="flex-row items-center gap-2 py-1.5 pl-1.5 pr-4">
        {/* Placeholder: what the companion looks like is still open (#590). */}
        <View className="size-8 items-center justify-center rounded-full bg-accent/20">
          <SymbolView name={{ ios: "flame.fill", android: "local_fire_department" }} size={16} tintColor={accent} />
        </View>
        <View>
          <AppText className="text-[15px] font-semibold text-foreground">{name}</AppText>
          <AppText className={late ? "text-[11px] text-warning" : "text-[11px] text-muted"}>
            {!talk.started ? "Ready when you are" : late ? `${talk.presence} · ${clockOf(secondsLeft)} left` : talk.presence}
          </AppText>
        </View>
      </View>
    </GlassSurface>
  );
}

export function TalkHeader({ talk }: { talk: Talk }) {
  const name = useCompanionName();
  const { isDark } = useAppTheme();
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");
  // Whole minutes: a label that changes every second rebuilds the open menu.
  const minutesLeft = useTimeLeft(talk.connected ? talk.endsAt : null, 60_000);
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          // Android has no glass or blur behind a header, so it stays solid there.
          headerTransparent: ios,
          headerStyle: ios ? undefined : { backgroundColor: background },
          headerBlurEffect: ios && !hasGlass ? (isDark ? "dark" : "light") : undefined,
          scrollEdgeEffects: hasGlass ? { top: "soft" } : undefined,
          headerShadowVisible: false,
          headerTintColor: foreground,
          headerBackButtonDisplayMode: "minimal",
          title: name,
          // eslint-disable-next-line react/no-unstable-nested-components -- header render prop
          headerTitle: () => <TitlePill talk={talk} />,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon={ios ? "ellipsis" : MoreVert}
          accessibilityLabel="Talk options"
          title={minutesLeft === null ? undefined : `${minutesLeft} min left in this talk`}
        >
          <Stack.Toolbar.MenuAction
            icon={talk.isMuted ? "mic" : "mic.slash"}
            disabled={!talk.connected}
            onPress={talk.toggleMic}
          >
            {talk.isMuted ? "Unmute mic" : "Mute mic"}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="lifepreserver" onPress={() => router.push("/crisis-resources?from=talk")}>
            Get help now
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="sparkles" disabled={!talk.connected} onPress={talk.end}>
            End and make my mirror
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
