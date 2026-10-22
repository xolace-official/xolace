import { View } from 'react-native';
import { Image } from 'expo-image';
import { PressableFeedback, Spinner, useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

const CAMERA_ICON = { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as const;
const IMAGE_STYLE = { width: '100%', height: '100%' } as const;

export function PhotoStep({
  photoUrl,
  uploading,
  onPick,
}: {
  photoUrl?: string;
  uploading: boolean;
  onPick: () => void;
}) {
  const muted = useThemeColor('muted') as string;

  return (
    <View className="items-center gap-3 pt-4">
      <PressableFeedback
        onPress={() => {
          playSoftPress();
          onPick();
        }}
        isDisabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={photoUrl ? 'Change your photo' : 'Add a photo'}
      >
        <View className="h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-surface-secondary">
          {uploading ? (
            <Spinner />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={IMAGE_STYLE} contentFit="cover" />
          ) : (
            <SymbolView name={CAMERA_ICON} size={26} tintColor={muted} />
          )}
        </View>
      </PressableFeedback>
      <AppText className="text-[13px] font-semibold text-accent">
        {photoUrl ? 'Choose a different photo' : 'Choose a photo'}
      </AppText>
      <AppText className="max-w-65 text-center text-[11px] leading-4 text-muted">
        This is the only image anyone sees. It stays on your Xolacer profile and nowhere
        else.
      </AppText>
    </View>
  );
}
