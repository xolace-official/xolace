import { Stack } from 'expo-router';
import { useLargeHeaderOptions } from '@/src/lib/navigation-options';

const CONNECT_OPTIONS = { title: 'Connect' };
const ARCHIVED_OPTIONS = { title: 'Archived', headerBackButtonDisplayMode: 'minimal' as const };

export default function ConnectLayout() {
  const largeHeaderOptions = useLargeHeaderOptions();

  return (
    <Stack
      screenOptions={largeHeaderOptions}
    >
      <Stack.Screen name="index" options={CONNECT_OPTIONS} />
      <Stack.Screen name="archived" options={ARCHIVED_OPTIONS} />
    </Stack>
  );
}
