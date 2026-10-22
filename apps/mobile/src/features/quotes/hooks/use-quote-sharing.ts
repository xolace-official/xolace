import type { ViewInstance } from 'react-native';
import { useRef, useState } from "react";
import { PixelRatio, Platform } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";

/**
 * The export's width in device pixels. The twin lays out in the hero's own pt
 * geometry, so the height is whatever that width times the twin's aspect comes
 * to — aspect is a consequence of the poster, never a chosen frame (#317).
 *
 * Both natives ignore `width` unless `height` comes with it (iOS falls back to
 * the view's bounds, Android skips the rescale), and iOS multiplies the size it
 * is given by the device scale — so the pt/px conversion below is what actually
 * lands 1080 pixels.
 */
const EXPORT_WIDTH_PX = 1080;

const exportWidth = Math.round(
  Platform.OS === "ios" ? EXPORT_WIDTH_PX / PixelRatio.get() : EXPORT_WIDTH_PX,
);

export function useQuoteSharing(displayedQuote: { text: string; type: "session" | "curated" } | null) {
  const sharingCardRef = useRef<ViewInstance>(null);
  const layoutResolverRef = useRef<(() => void) | null>(null);
  const imageResolverRef = useRef<(() => void) | null>(null);
  const imageLoadedRef = useRef(false);
  const cardSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [showSharingCard, setShowSharingCard] = useState(false);
  const [shareImageUri, setShareImageUri] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const { toast } = useToast();
  const posthog = usePostHog();

  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called from the off-screen wrapper's onLayout — signals the card is ready to
  // capture, and hands over the twin's laid-out size so the export keeps its aspect.
  const onSharingCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) cardSizeRef.current = { width, height };
    if (layoutTimeoutRef.current !== null) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = null;
    }
    layoutResolverRef.current?.();
    layoutResolverRef.current = null;
  };

  const onSharingCardImageLoadEnd = () => {
    imageLoadedRef.current = true;
    imageResolverRef.current?.();
    imageResolverRef.current = null;
  };

  const handleShare = async () => {
    if (!displayedQuote || isSharingLoading) return;
    posthog.capture('quote_share_initiated', { quote_type: displayedQuote.type });
    setIsSharingLoading(true);
    imageLoadedRef.current = false;
    setShowSharingCard(true);
    try {
      // Wait until the off-screen card reports its layout before capturing.
      await new Promise<void>((resolve) => {
        layoutResolverRef.current = resolve;
        layoutTimeoutRef.current = setTimeout(() => {
          layoutTimeoutRef.current = null;
          layoutResolverRef.current = null;
          resolve();
        }, 4000);
      });

      // Ensure the twin is painted before capture — its mascot decoded and its
      // fit search landed. The fallback is generous because that search costs a
      // few frames: cut short, the export is a blank paper card (#317).
      if (!imageLoadedRef.current) {
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, 1200);
          imageResolverRef.current = () => {
            clearTimeout(timeoutId);
            resolve();
          };
        });
      }

      const size = cardSizeRef.current;
      const uri = await captureRef(sharingCardRef, {
        format: "png",
        quality: 1,
        ...(size
          ? {
              width: exportWidth,
              height: Math.round(exportWidth * (size.height / size.width)),
            }
          : null),
      });
      setShareImageUri(uri);
      setShowShareSheet(true);
    } catch {
      toast.show({
        label: "Couldn't prepare image",
        description: "Something went wrong. Try again.",
        variant: "default",
      });
    } finally {
      if (layoutTimeoutRef.current !== null) {
        clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = null;
      }
      layoutResolverRef.current = null;
      imageResolverRef.current = null;
      setIsSharingLoading(false);
      setShowSharingCard(false);
    }
  };

  return {
    handleShare,
    onSharingCardLayout,
    onSharingCardImageLoadEnd,
    sharingCardRef,
    isSharingLoading,
    showSharingCard,
    showShareSheet,
    setShowShareSheet,
    shareImageUri,
    setShareImageUri,
  };
}
