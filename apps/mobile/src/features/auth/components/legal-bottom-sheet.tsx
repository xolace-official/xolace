import { BottomSheet } from 'heroui-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { AppText } from '@/src/components/shared/app-text';
import { BottomSheetBlurOverlay } from '@/src/components/bottom-sheet-blur-overlay';
import type { LegalDocument } from './legal-content';

type Props = {
  document: LegalDocument | null;
  onClose: () => void;
};

const SNAP_POINTS = ['90%'];

export const LegalBottomSheet = ({ document, onClose }: Props) => {
  const isOpen = document !== null;

  const handleOpenFull = async () => {
    if (!document) return;
    await openBrowserAsync(document.fullUrl, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  };

  const handleOpenChange = (open: boolean) => { if (!open) onClose(); };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheetBlurOverlay />
        <BottomSheet.Content
          accessible={false}
          snapPoints={SNAP_POINTS}
          enableOverDrag={false}
          enableDynamicSizing={false}
          backgroundClassName="bg-background"
          handleIndicatorClassName="bg-foreground"
          contentContainerClassName="h-full"
        >
          <BottomSheet.Close className="absolute top-4 right-4 z-10" />

          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {document && (
              <>
                <AppText
                  className="text-[22px] mb-6"
                  style={styles.fontMedium}
                >
                  {document.title}
                </AppText>

                {document.sections.map((section) => (
                  <View key={section.heading} style={styles.section}>
                    <AppText
                      className=" text-[14px] mb-1"
                      style={styles.fontMedium}
                    >
                      {section.heading}
                    </AppText>
                    <AppText
                      className="text-[13px] leading-6"
                      style={styles.fontRegular}
                    >
                      {section.body}
                    </AppText>
                  </View>
                ))}

                <View style={styles.footer}>
                  <AppText
                    className="text-[12px] text-center"
                    style={styles.fontRegular}
                    onPress={handleOpenFull}
                  >
                    This is a summary.{' '}
                    <AppText
                      className="text-[12px]"
                      style={styles.underline}
                    >
                      Read the full version at xolaceinc.com
                    </AppText>
                  </AppText>
                </View>
              </>
            )}
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 8,
  },
  fontMedium: { fontFamily: 'Poppins-Medium' },
  fontRegular: { fontFamily: 'Poppins-Regular' },
  section: { marginBottom: 20 },
  // eslint-disable-next-line react-native/no-color-literals
  footer: {
    marginTop: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  underline: { textDecorationLine: 'underline' },
});
