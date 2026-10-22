import { Stack } from 'expo-router';

/**
 * The promise screen — a signed-out user's very first mount, before
 * `introSeen` is set. Root-guarded (see `src/app/_layout.tsx`): once the
 * promise's CTA sets `introSeen`, this group's guard goes false and
 * Stack.Protected swaps straight to `(auth)` on its own.
 */
const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'fade' as const,
  contentStyle: { backgroundColor: 'transparent' },
};

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
