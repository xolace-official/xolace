import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';

/**
 * Post-signup intake (T6, issue #263). A fourth root-level group, sibling to
 * `(onboarding)` / `(auth)` / `(protected)` — deliberately NOT nested inside
 * `(protected)`, whose layout mounts Stream chat, presence and push. An
 * unfinished user shouldn't pay for any of that.
 *
 * Forward-only: `gestureEnabled: false` everywhere, and every advance is a
 * `push`/`replace` — there is no back edge out of intake.
 */
const SCREEN_OPTIONS = {
  headerShown: false,
  gestureEnabled: false,
  contentStyle: { backgroundColor: 'transparent' },
};

export default function IntakeLayout() {
  // "Intake wins, a pending deep link is not preserved" (T3, issue #234).
  // That used to hold for free: the response listener lived in `(protected)`,
  // so a tap that launched the app was gone before anything could read it.
  // `(protected)` now recovers the launch tap from the native cache — which
  // would fling a user out of intake the instant they finished it — so the
  // invariant has to be stated rather than inherited.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.clearLastNotificationResponse();
  }, []);

  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="index" />
      <Stack.Screen name="questionnaire" />
      <Stack.Screen name="paywall" />
      {/* The plans step is the one intake screen with a header: PaywallScreen
          hangs its close and Restore buttons off the native toolbar. Still not
          a modal — it's a linear step, so it keeps intake's forward-only
          gesture rule. */}
      <Stack.Screen
        name="plans"
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
