import * as Linking from 'expo-linking';
import { BottomSheet, Button } from 'heroui-native';
import type { FC } from 'react';
import { View } from 'react-native';
import { BottomSheetBlurOverlay } from '@/src/components/bottom-sheet-blur-overlay';
import { STORE_URL } from '@/src/lib/constants/links';

export type UpdateBottomSheetMode = 'new-version' | 'ota-update';

type Props = {
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
  mode: UpdateBottomSheetMode;
};

const CONTENT: Record<UpdateBottomSheetMode, { title: string; description: string; primaryLabel: string }> = {
  'new-version': {
    title: 'New Version Available',
    description: 'A newer version is available on the App Store. Update to get the latest features and improvements.',
    primaryLabel: 'Download Now',
  },
  'ota-update': {
    title: 'Update Ready',
    description: "New updates are ready. They'll apply automatically the next time you open the app.",
    primaryLabel: 'Got it',
  },
};

export const UpdateBottomSheet: FC<Props> = ({ isOpen, onOpenChange, mode }) => {
  const { title, description, primaryLabel } = CONTENT[mode];

  const handlePrimaryPress = () => {
    if (mode === 'new-version') {
      if (STORE_URL) Linking.openURL(STORE_URL);
      return;
    }
    // No Updates.reloadAsync() here: the relaunch destroys the JS runtime while pending
    // JSI promises are still in flight on expo's async-function queue, and their
    // JavaScriptPromise destructors then deref the dead runtime (EXC_BAD_ACCESS on iOS).
    // The already-fetched update applies on the next cold start instead.
    onOpenChange(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheetBlurOverlay />
        <BottomSheet.Content
          accessible={false}
          backgroundClassName="bg-background"
          handleIndicatorClassName="bg-foreground/20"
        >
          <View className="mb-8 gap-2 items-center">
            <BottomSheet.Title className="text-center">{title}</BottomSheet.Title>
            <BottomSheet.Description className="text-center">{description}</BottomSheet.Description>
          </View>
          <View className="gap-3">
            <Button size="lg" onPress={handlePrimaryPress} className="w-full">
              {primaryLabel}
            </Button>
            {mode === 'new-version' && (
              <Button variant="tertiary" size="lg" onPress={() => onOpenChange(false)} className="w-full">
                Later
              </Button>
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};
