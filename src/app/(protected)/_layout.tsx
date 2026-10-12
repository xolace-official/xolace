import { Stack } from "expo-router";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { AppPresence } from "@/src/providers/app-presence";
import { useNotifications } from "@/src/lib/use-notifications";
import {
  StreamChatProvider,
  StreamOverlayProvider,
} from "@/src/features/xolacer-chat/providers/stream-chat-provider";
import { UnreadIconBadge } from "@/src/features/xolacer-chat/components/unread-icon-badge";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColor } from "heroui-native";

/**
 * Provides the navigation layout used by protected routes.
 * Initializes push notification registration for authenticated users.
 */
const SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: "transparent" },
};

const NO_GESTURE = { gestureEnabled: false };

/** Skipping a rating should feel like dismissing, not navigating away. */
const RATE_OPTIONS = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
} as const;

/**
 * Same dismissal feel as the rating sheet, but opened at full height: every
 * field (photo, name, bio, specialties, listed) is reachable immediately
 * instead of behind a manual drag, and Cancel/Save live in the native header.
 */
const EDIT_PROFILE_OPTIONS = {
  headerShown: true,
  presentation: "formSheet" as const,
  sheetAllowedDetents: [1],
  sheetCornerRadius: 28,
};


const PLAYER_OPTIONS = { presentation: "fullScreenModal", animation: "slide_from_bottom" } as const;

const CHAT_OPTIONS = {
  headerShown: true,
  title: "",
  headerBackButtonDisplayMode: "minimal",
  headerShadowVisible: false,
} as const;

export default function ProtectedLayout() {
  // Stays here, not at the root: an unfinished user shouldn't pay for push.
  // "Intake wins, a pending deep link is not preserved" (T3, issue #234) is no
  // longer a free consequence of that — the launch tap now survives in the
  // native cache rather than being dropped — so `(intake)`'s layout discards it
  // explicitly. Change one of those two and you change the invariant.
  // usePostHogIdentity is hoisted to the root — it must run during intake.
  useNotifications();
  const reducedMotion = useEffectiveReducedMotion();
  const background = useThemeColor("background");
  // Small native sheets sized to their rows. iOS 26 paints its own glass behind
  // a transparent screen (tinted to the app theme by NavThemeProvider's
  // appearance sync); iOS 18 and Android show transparent literally, so they
  // get the theme fill.
  const fitSheetOptions = {
    presentation: "formSheet",
    sheetAllowedDetents: "fitToContents",
    sheetGrabberVisible: true,
    contentStyle: isLiquidGlassAvailable() ? undefined : { backgroundColor: background },
  } as const;

  return (
    // Above the Stack so the message overlay can lay itself out against the
    // whole window, header included — see StreamOverlayProvider.
    <StreamOverlayProvider>
      <StreamChatProvider>
        {/* Renders nothing — it is here, above the Stack, so presence keeps
            reporting whichever screen the user is on. */}
        <AppPresence />
        <UnreadIconBadge />
        {/* Points Reanimated's "System" at the in-app tri-state, so every
            withSpring/withTiming/entering that doesn't opt out follows it, not
            just the OS flag. Here, not the root: preferences.get needs auth. */}
        <ReducedMotionConfig
          mode={reducedMotion ? ReduceMotion.Always : ReduceMotion.Never}
        />
        <Stack screenOptions={SCREEN_OPTIONS}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={NO_GESTURE} />
          <Stack.Screen name="sit-with-this" options={NO_GESTURE} />
          <Stack.Screen name="peer-reflections" options={NO_GESTURE} />
          <Stack.Screen
            name="kindling-announcement"
            options={{ gestureEnabled: false, animation: reducedMotion ? "fade" : "slide_from_bottom" }}
          />
          <Stack.Screen name="session-end" options={NO_GESTURE} />
          <Stack.Screen name="crisis-resources" options={NO_GESTURE} />
          <Stack.Screen name="trusted-bridge" />
          <Stack.Screen
            name="voice-vent"
            options={{ gestureEnabled: false, animation: "fade" }}
          />
          <Stack.Screen name="quotes/index" />
          <Stack.Screen name="quotes/archive" />
          <Stack.Screen name="kindling/index" />
          {/* Outside `(tabs)` on purpose: the player is full-bleed, no tab bar. */}
          <Stack.Screen name="browse-player" options={PLAYER_OPTIONS} />
          <Stack.Screen name="streak-held" options={PLAYER_OPTIONS} />
          {/* The close button (or Android back) is the no-guilt dismiss. */}
          <Stack.Screen name="follow-up" options={PLAYER_OPTIONS} />
          {/* Hold-to-continue is the only way out: no swipe-dismiss here, Android back swallowed in the route. */}
          <Stack.Screen name="browse-intro" options={{ ...PLAYER_OPTIONS, gestureEnabled: false }} />
          {/* Reduced motion: the Lantern reader crossfades in instead of sliding (#400). */}
          <Stack.Screen name="library/[slug]" options={{ animation: reducedMotion ? "fade" : "default" }} />

          
          <Stack.Screen name="chat/[conversationId]" options={CHAT_OPTIONS} />
          <Stack.Screen name="xolace-channel" options={CHAT_OPTIONS} />
          <Stack.Screen name="xolacer/[profileId]" />
          <Stack.Screen name="xolacer-setup" />
          <Stack.Screen name="xolacer-edit" options={EDIT_PROFILE_OPTIONS} />
          <Stack.Screen name="rate/[conversationId]" options={RATE_OPTIONS} />
          <Stack.Screen name="report-reflection" options={fitSheetOptions} />
          {/* The reader stays undimmed behind it, so mode and size changes show on the page live. */}
          <Stack.Screen
            name="reader-appearance"
            options={{ ...fitSheetOptions, sheetLargestUndimmedDetentIndex: "last" }}
          />
        </Stack>
      </StreamChatProvider>
    </StreamOverlayProvider>
  );
}
