import { useState } from "react";
import { Modal, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image, type ImageLoadEventData } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";
import { QuickAction } from "./quick-action";
import { SocialIcon } from "./social-icon";
import { useQuoteShareActions } from "@/src/features/quotes/hooks/use-quote-share-actions";

type Props = {
  visible: boolean;
  imageUri: string | null;
  quoteType: "session" | "curated";
  onClose: () => void;
};

// WhatsApp / Telegram deep-link image sharing is broken on iOS at the OS level
// (their URL schemes only accept text). On iOS we surface Instagram + More,
// and users can reach WhatsApp/Telegram from the system share sheet via More.
const SOCIAL_ITEMS = (
  Platform.OS === "ios"
    ? [
        { label: "Instagram", ios: "camera.fill", android: "photo_camera" },
        { label: "More", ios: "ellipsis", android: "more_horiz" },
      ]
    : [
        { label: "WhatsApp", ios: "bubble.left.fill", android: "chat" },
        { label: "Telegram", ios: "paperplane.fill", android: "send" },
        { label: "Instagram", ios: "camera.fill", android: "photo_camera" },
        { label: "More", ios: "ellipsis", android: "more_horiz" },
      ]
) as readonly { label: string; ios: string; android: string }[];

const GRADIENT_TOP_START: [number, number] = [0, 0];
const GRADIENT_TOP_END: [number, number] = [1, 0.4];
const CLOSE_ICON = { ios: "xmark" as const, android: "close" as const };

export function QuoteShareSheet({ visible, imageUri, quoteType, onClose }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const foregroundColor = useThemeColor("foreground") as string;
  const backgroundColor = useThemeColor("background") as string;
  const surfaceColor = useThemeColor("surface") as string;
  const accentColor = useThemeColor("accent") as string;
  const { shareViaWhatsApp, shareViaTelegram, shareViaInstagram, shareMore, saveToLibrary } =
    useQuoteShareActions(imageUri, quoteType);

  // The poster has no chosen frame — its aspect is whatever the hero's own
  // geometry comes to (#317) — so the preview takes the exported image's aspect
  // rather than a fixed 9:16 box that crops the title and the wordmark off.
  const [aspect, setAspect] = useState<number | null>(null);
  const previewWidth = width * 0.72;
  const previewHeight = aspect ? previewWidth / aspect : previewWidth * (16 / 9);

  const backdropStyle = { backgroundColor };
  const gradientTopColors: [string, string] = [
    `${accentColor}18`,
    "transparent",
  ];
  const gradientBottomColors: [string, string] = [
    "transparent",
    `${accentColor}22`,
  ];
  const headerStyle = { paddingTop: top + 16, paddingBottom: 20 };
  const glassStyle = {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: `${foregroundColor}0D`,
  };
  const shareLabelStyle = { color: `${foregroundColor}60` };
  const previewContainerStyle = {
    width: previewWidth,
    height: previewHeight,
    borderRadius: 20,
    overflow: "hidden" as const,
    backgroundColor: surfaceColor,
  };
  const preparingTextStyle = { color: `${foregroundColor}40` };
  const imageSource = { uri: imageUri ?? "" };
  const socialRowStyle = { marginTop: 28, paddingBottom: bottom + 40 };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1" style={backdropStyle}>
        {/* Gradient layers — give GlassView content to refract */}
        <LinearGradient
          colors={gradientTopColors}
          start={GRADIENT_TOP_START}
          end={GRADIENT_TOP_END}
          style={styles.gradientTop}
          pointerEvents="none"
        />
        <LinearGradient
          colors={gradientBottomColors}
          style={styles.gradientBottom}
          pointerEvents="none"
        />

        {/* Header */}
        <View
          className="flex-row items-center justify-between px-6"
          style={headerStyle}
        >
          <PressableFeedback
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Close"
          >
            <GlassView style={glassStyle} glassEffectStyle="clear">
              <SymbolView
                name={CLOSE_ICON}
                size={15}
                tintColor={`${foregroundColor}70`}
              />
            </GlassView>
          </PressableFeedback>
          <AppText className="text-sm font-medium" style={shareLabelStyle}>
            Share
          </AppText>
          <View style={styles.spacer} />
        </View>

        {/* Image preview */}
        <View className="items-center">
          <View style={previewContainerStyle}>
            {imageUri ? (
              <Image
                source={imageSource}
                style={styles.previewImage}
                contentFit="contain"
                onLoad={(e: ImageLoadEventData) =>
                  setAspect(e.source.width / e.source.height)
                }
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <AppText className="text-xs" style={preparingTextStyle}>
                  Preparing…
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Quick actions */}
        <View
          className="flex-row justify-center gap-8"
          style={styles.quickActionsRow}
        >
          <QuickAction
            iosIcon="square.and.arrow.down"
            androidIcon="save_alt"
            label="Save"
            foregroundColor={foregroundColor}
            onPress={saveToLibrary}
          />
          <QuickAction
            iosIcon="square.and.arrow.up"
            androidIcon="share"
            label="Share"
            foregroundColor={foregroundColor}
            onPress={shareMore}
          />
        </View>

        {/* Social row */}
        <View className="flex-row justify-center gap-6" style={socialRowStyle}>
          {SOCIAL_ITEMS.map((item) => (
            <SocialIcon
              key={item.label}
              label={item.label}
              ios={item.ios}
              android={item.android}
              foregroundColor={foregroundColor}
              onPress={
                item.label === "WhatsApp" ? shareViaWhatsApp :
                item.label === "Telegram" ? shareViaTelegram :
                item.label === "Instagram" ? shareViaInstagram :
                shareMore
              }
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradientTop: { position: "absolute", top: 0, left: 0, right: 0, height: 160 },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  spacer: { width: 40 },
  quickActionsRow: { marginTop: 28 },
  previewImage: { width: "100%", height: "100%" },
});
