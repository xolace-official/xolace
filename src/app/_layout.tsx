/**
 * Root layout — wraps the entire app in providers and renders the tab navigation.
 *
 * Provider order: RootProvider (gestures, keyboard, theme, HeroUI) → ThemeProvider (React Navigation).
 * See src/providers/root-provider.tsx to add your own providers (auth, analytics, etc.).
 */
import '@/src/lib/clerk-online-polyfill';
import '@/src/global.css';
import '@/src/lib/theme-bootstrap';

import { Settings } from 'react-native-pulsar';


import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from 'react';
import { Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { useUniwind } from 'uniwind'
import * as SplashScreen from 'expo-splash-screen';
import { useConvexAuth } from 'convex/react';
import { useFullContext } from '@/src/lib/convex/use-full-context';
import { useAuth } from '@clerk/expo';
import { usePostHog } from 'posthog-react-native';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts
} from '@expo-google-fonts/space-grotesk';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';

import { RootProvider } from '@/src/providers/root-provider';
import { usePostHogIdentity } from '@/src/lib/use-posthog-identity';
import { useAppStore } from '@/src/store/store';
import { ChatLocalDataGuard } from '@/src/features/xolacer-chat/chat-local-data-guard';
import { UpdateBottomSheet, type UpdateBottomSheetMode } from '@/src/components/shared/update-bottom-sheet';
import { useOtaUpdate } from '@/src/helpers/hooks/use-ota-update';
import { useVersionCheck } from '@/src/helpers/hooks/use-version-check';
import { FullRippleLoader } from '@/src/components/shared/loader/ripple/full-ripple-loader';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DNS,

  // Label events so dev traffic never mixes with production in the dashboard.
  environment: __DEV__ ? 'development' : 'production',

  // Don't auto-collect IP/cookies/device PII. We attach only the userId we
  // need for the auth-guard breadcrumb trail via Sentry.setUser below.
  sendDefaultPii: false,

  // Enable Logs
  enableLogs: true,

  // Session Replay — production only, so dev sessions don't pollute prod data.
  replaysSessionSampleRate: __DEV__ ? 0 : 0.1,
  replaysOnErrorSampleRate: __DEV__ ? 0 : 1,
  integrations: __DEV__ ? [] : [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Per-route navigation metrics (cold_ttr / warm_ttr / per-route tti). Must run
// at module scope before any screen mounts — toggling it after mount throws.
Observe.configure({ integrations: { 'expo-router': true } });

SplashScreen.preventAutoHideAsync();

Settings.enableSound(false);
Settings.preloadPresets([
  'Herald',    // mirrorArrival — peak haptic, must be instant
  'Bloom',     // sessionComplete
  'Feather',   // gentlePresence, onboarding transitions
  'Propel',    // form submit
  'Strike',    // affirmativePress
  'Cascade',   // onboardingEntrance
  'BellToll',  // followUpEntrance — plays on mount, must not lag
  'Wobble',    // errorNotice, clarifyState mount
  'Peal',      // escalationState mount
  'Flick',     // carousel advance, textureSelect
  'Thud',      // menu open, homeEntrance
  'Chirp',     // resonanceToggle, lighter mood
  'Murmur',    // peerReflections mount, unsure mood
  'Breath',    // processingBreath fallback
  'Swell',     // insights overall dial fill — plays on mount
]);

// Surface any route-subtree render crash to Sentry. metro.config.js uses
// getSentryExpoConfig, which auto-wraps this re-export so the error is captured
// (with route context) before Expo Router shows its fallback — otherwise a
// cold-start render throw is swallowed silently.
export { ErrorBoundary } from 'expo-router';

const NO_HEADER = { headerShown: false };

const AppContent = () => {
  const introSeen = useAppStore((s) => s.introSeen);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { isSignedIn, isLoaded: isClerkLoaded, userId } = useAuth();
  const posthog = usePostHog();

  // The intake gate (T6, issue #263). Hoisted to the root — with
  // usePostHogIdentity, which reads the same query — so the root is the single
  // subscriber and Convex dedupes every downstream read.
  const context = useFullContext(!isAuthenticated);
  usePostHogIdentity();
  const onboardingComplete = context?.profile.onboardingComplete === true;
  const intakeGateLoading = isAuthenticated && context === undefined;

  // Record the exact inputs to the route-group guard on every change. On a prod
  // cold start where the user is wrongly sent to (auth), this breadcrumb trail
  // shows whether Clerk loaded signed-out (cache miss) or Clerk is signed-in
  // while Convex never authenticated (desync) — the two have different fixes.
  useEffect(() => {
    Sentry.setUser(userId ? { id: userId } : null);
    const group = !isAuthenticated
      ? introSeen
        ? "(auth)"
        : "(onboarding)"
      : onboardingComplete
        ? "(protected)"
        : "(intake)";
    Sentry.addBreadcrumb({
      category: "auth.guard",
      level: isClerkLoaded && isSignedIn && !isAuthenticated ? "warning" : "info",
      message: `route guard → ${group}`,
      data: {
        introSeen,
        clerkLoaded: isClerkLoaded,
        clerkSignedIn: !!isSignedIn,
        convexAuthenticated: isAuthenticated,
        convexAuthLoading: isAuthLoading,
        onboardingComplete,
        intakeGateLoading,
      },
    });
  }, [
    introSeen,
    isAuthenticated,
    isAuthLoading,
    isClerkLoaded,
    isSignedIn,
    userId,
    onboardingComplete,
    intakeGateLoading,
  ]);
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);
  const { markInteractive } = useObserve();

  useEffect(() => {
    if (!isAuthLoading) {
      markInteractive();
    }
  }, [isAuthLoading, markInteractive]);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        path: typeof params.path === 'string' ? params.path : null,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params, posthog]);

  // Hold the loader while the gate query is in flight rather than rendering
  // (protected) optimistically and bouncing the user out of it a frame later.
  if (isAuthLoading || intakeGateLoading) return <FullRippleLoader />;
  return (
    <>
      {/* Above every route group so it outlives (protected) — see the component. */}
      <ChatLocalDataGuard />
      <Stack screenOptions={NO_HEADER}>
        <Stack.Protected guard={!isAuthenticated && !introSeen}>
          <Stack.Screen name="(onboarding)" options={NO_HEADER} />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated && introSeen}>
          <Stack.Screen name="(auth)" options={NO_HEADER} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && !onboardingComplete}>
          <Stack.Screen name="(intake)" options={NO_HEADER} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && onboardingComplete}>
          <Stack.Screen name="(protected)" options={NO_HEADER} />
          <Stack.Screen
            name="(paywall)"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </Stack.Protected>
      </Stack>
    </>
  )
}

/**
 * Wraps the app content with root providers and supplies a navigation theme based on the current Uniwind theme.
 *
 * The component retrieves the active theme from `useUniwind` and passes `DarkTheme` when the theme equals `"dark"`, otherwise `DefaultTheme`. It also establishes the `RootProvider` context before rendering the app content.
 *
 * @returns The root layout element that provides app-wide context and a navigation theme.
 */
function RootLayout() {
  const { theme } = useUniwind();
  const setIsVersionChecked = useAppStore((s) => s.setIsVersionChecked);
  const setIsNewVersionAvailable = useAppStore((s) => s.setIsNewVersionAvailable);
  const isVersionChecked = useAppStore((s) => s.isVersionChecked);
  const isNewVersionAvailable = useAppStore((s) => s.isNewVersionAvailable);
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [updateSheetMode, setUpdateSheetMode] = useState<UpdateBottomSheetMode>('new-version');

  const handleVersionChecked = (isNew: boolean) => {
    setIsVersionChecked(true);
    setIsNewVersionAvailable(isNew);
    if (isNew) {
      setUpdateSheetMode('new-version');
      setUpdateSheetOpen(true);
    }
  };

  const handleOtaUpdateReady = () => {
    setUpdateSheetMode('ota-update');
    setUpdateSheetOpen(true);
  };

  useVersionCheck({ onVersionChecked: handleVersionChecked });
  useOtaUpdate({ isVersionChecked, isNewVersionAvailable, onUpdateReady: handleOtaUpdateReady });

  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <RootProvider>
      <ThemeProvider value={theme.includes('dark') ? DarkTheme : DefaultTheme}>
        <AppContent />
        <UpdateBottomSheet
          isOpen={updateSheetOpen}
          onOpenChange={setUpdateSheetOpen}
          mode={updateSheetMode}
        />
      </ThemeProvider>
    </RootProvider>
  );
}

export default Sentry.wrap(ObserveRoot.wrap(RootLayout));
