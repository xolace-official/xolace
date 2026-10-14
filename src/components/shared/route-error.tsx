import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ErrorBoundaryProps } from 'expo-router';
import { Observe } from 'expo-observe';
import * as Sentry from '@sentry/react-native';

import { AppText } from '@/src/components/shared/app-text';

/**
 * Root route error fallback (exported as `ErrorBoundary` from the root layout).
 *
 * Renders OUTSIDE RootProvider — no HeroUI, Clerk, Convex or theme context — so
 * it uses only global Uniwind tokens and plain RN primitives. ExpoRoot's own
 * SafeAreaProvider is still above it.
 *
 * Expo Router's boundary swallows the error, so this reports it itself. The
 * message is never shown in production: it is written for us, and on a
 * mental-health journal raw error text is both noise and a possible leak.
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Sentry.captureException(error);
    Observe.reportError(error);
  }, [error]);

  return (
    <View
      className="flex-1 items-center justify-center gap-3 bg-background px-10"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <AppText accessibilityRole="header" className="text-center text-xl font-semibold">
        Something went wrong
      </AppText>
      <AppText className="text-center text-base text-muted">
        Try again to reload this screen.
      </AppText>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        className="mt-4 rounded-full bg-accent/10 px-8 py-3"
      >
        <AppText className="text-center text-base font-semibold text-accent">Try again</AppText>
      </Pressable>
      {__DEV__ ? (
        <AppText selectable className="mt-6 text-center text-xs text-muted">
          {error.message}
        </AppText>
      ) : null}
    </View>
  );
}
