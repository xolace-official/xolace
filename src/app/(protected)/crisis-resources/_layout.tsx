import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { useLargeHeaderOptions } from '@/src/lib/navigation-options';

const BACK_ICON_NAME = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as const;
const INDEX_OPTIONS = { title: 'Get Help Now' };

export default function CrisisResourcesLayout() {
  const router = useRouter();
  const largeHeaderOptions = useLargeHeaderOptions();
  const tintColor = useThemeColor('foreground') as string;

  const renderBackButton = () => (
    <PressableFeedback onPress={() => router.back()} hitSlop={8}>
      <SymbolView
        name={BACK_ICON_NAME}
        size={20}
        tintColor={tintColor}
      />
    </PressableFeedback>
  );

  const screenOptions = {
    ...largeHeaderOptions,
    headerLeft: renderBackButton,
  };

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={INDEX_OPTIONS} />
    </Stack>
  );
}
