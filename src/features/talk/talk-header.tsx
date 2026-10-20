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
import { COMPANION_NAME } from "./talk-copy";
import type { Talk } from "./use-talk";

const ios = Platform.OS === "ios";
// Only iOS 26 paints glass behind a transparent header; older iOS gets a blur.
const hasGlass = isLiquidGlassAvailable();

function TitlePill({ talk }: { talk: Talk }) {
  const accent = useThemeColor("accent");
  return (
    <GlassSurface radius={22}>
      <View className="flex-row items-center gap-2 py-1.5 pl-1.5 pr-4">
        {/* Placeholder: what the companion looks like is still open (#590). */}
        <View className="size-8 items-center justify-center rounded-full bg-accent/20">
          <SymbolView name={{ ios: "flame.fill", android: "local_fire_department" }} size={16} tintColor={accent} />
        </View>
        <View>
          <AppText className="text-[15px] font-semibold text-foreground">{COMPANION_NAME}</AppText>
          <AppText className="text-[11px] text-muted">{talk.started ? talk.presence : "Ready when you are"}</AppText>
        </View>
      </View>
    </GlassSurface>
  );
}

export function TalkHeader({ talk }: { talk: Talk }) {
  const { isDark } = useAppTheme();
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");
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
          title: COMPANION_NAME,
          // eslint-disable-next-line react/no-unstable-nested-components -- header render prop
          headerTitle: () => <TitlePill talk={talk} />,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={ios ? "ellipsis" : MoreVert} accessibilityLabel="Talk options">
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
