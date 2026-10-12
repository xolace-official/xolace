import { Stack, useRouter } from 'expo-router';
import ArrowBack from '@expo/material-symbols/arrow_back.xml';
import { playSoftPress } from '@/src/lib/haptics';
import { useLargeHeaderOptions } from '@/src/lib/navigation-options';

const INDEX_OPTIONS = { title: 'Get Help Now' };

export default function CrisisResourcesLayout() {
  const router = useRouter();
  const largeHeaderOptions = useLargeHeaderOptions();

  return (
    <Stack screenOptions={largeHeaderOptions}>
      <Stack.Screen name="index" options={INDEX_OPTIONS}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={process.env.EXPO_OS === 'ios' ? 'chevron.left' : ArrowBack}
            accessibilityLabel="Back"
            onPress={() => {
              playSoftPress();
              router.back();
            }}
          />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
