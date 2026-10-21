import { Stack } from 'expo-router';

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'fade' as const,
  contentStyle: { backgroundColor: 'transparent' },
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
