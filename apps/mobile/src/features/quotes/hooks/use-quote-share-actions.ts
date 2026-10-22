import { Platform } from "react-native";
import RNShare, { Social } from "react-native-share";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { useToast } from "heroui-native";
import { Presets } from "react-native-pulsar";
import { usePostHog } from "posthog-react-native";

// Required for Instagram Stories since Jan 2023.
// Set EXPO_PUBLIC_FB_APP_ID in your .env to enable Stories sharing.
const FB_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID ?? "";

export function useQuoteShareActions(
  imageUri: string | null,
  quoteType: "session" | "curated",
) {
  const { toast } = useToast();
  const posthog = usePostHog();

  const shareGeneric = async () => {
    if (!imageUri) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(imageUri, {
          mimeType: "image/png",
          UTI: "public.png",
        });
      } else {
        toast.show({ label: "Sharing not available", variant: "default" });
      }
    } catch {
      toast.show({
        label: "Couldn't share image",
        description: "Something went wrong. Try again.",
        variant: "default",
      });
    }
  };

  const shareViaWhatsApp = async () => {
    Presets.flick();
    if (!imageUri) return;
    posthog.capture("quote_shared", {
      platform: "whatsapp",
      quote_type: quoteType,
    });
    // WhatsApp's iOS URL scheme only accepts text — it silently ignores files.
    // UI hides this button on iOS; fall back defensively for any stray callers.
    if (Platform.OS === "ios") {
      await shareGeneric();
      return;
    }
    try {
      await RNShare.shareSingle({
        social: Social.Whatsapp,
        url: imageUri,
        type: "image/png",
      });
    } catch {
      await shareGeneric();
    }
  };

  const shareViaTelegram = async () => {
    Presets.flick();
    if (!imageUri) return;
    posthog.capture("quote_shared", {
      platform: "telegram",
      quote_type: quoteType,
    });
    // Telegram's iOS URL scheme stringifies the file path into the chat — not
    // an actual image. UI hides this button on iOS; defensive fallback here.
    if (Platform.OS === "ios") {
      await shareGeneric();
      return;
    }
    try {
      await RNShare.shareSingle({
        social: Social.Telegram,
        url: imageUri,
        type: "image/png",
      });
    } catch {
      await shareGeneric();
    }
  };

  const createMediaAsset = async (uri: string) => {
    await MediaLibrary.Asset.create(uri);
  };

  const shareViaInstagram = async () => {
    Presets.flick();
    if (!imageUri) return;
    posthog.capture("quote_shared", {
      platform: "instagram",
      quote_type: quoteType,
    });

    // Instagram Feed on iOS reads the latest item from the camera roll rather
    // than the URL we pass — so we save first so it picks up our quote image.
    if (Platform.OS === "ios" && !FB_APP_ID) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(false);
        if (status !== "granted") {
          toast.show({
            label: "Photo access needed",
            description:
              "Allow photo access so we can hand the image to Instagram.",
            variant: "default",
          });
          await shareGeneric();
          return;
        }
        await createMediaAsset(imageUri);
        toast.show({
          label: "Saved to Photos",
          description: "Opening Instagram…",
          variant: "default",
        });
        // Give the toast time to render before the app switches to Instagram.
        await new Promise<void>((r) => setTimeout(r, 700));
        await RNShare.shareSingle({
          social: Social.Instagram,
          url: imageUri,
          type: "image/*",
        });
      } catch {
        await shareGeneric();
      }
      return;
    }

    try {
      if (FB_APP_ID) {
        await RNShare.shareSingle({
          social: Social.InstagramStories,
          backgroundImage: imageUri,
          appId: FB_APP_ID,
        });
      } else {
        // Android: Instagram Feed share works directly with the file URI.
        await RNShare.shareSingle({
          social: Social.Instagram,
          url: imageUri,
          type: "image/*",
        });
      }
    } catch {
      await shareGeneric();
    }
  };

  const shareMore = async () => {
    Presets.flick();
    posthog.capture("quote_shared", {
      platform: "more",
      quote_type: quoteType,
    });
    await shareGeneric();
  };

  const saveToLibrary = async () => {
    if (!imageUri) return;
    Presets.flick();
    posthog.capture("quote_shared", {
      platform: "save_to_library",
      quote_type: quoteType,
    });
    const { status } = await MediaLibrary.requestPermissionsAsync(false);
    if (status !== "granted") {
      toast.show({
        label: "Permission denied",
        description: "Allow photo access in Settings to save images.",
        variant: "default",
      });
      return;
    }
    try {
      await createMediaAsset(imageUri);
      toast.show({ label: "Saved to Photos", variant: "default" });
    } catch {
      toast.show({
        label: "Couldn't save image",
        description: "Something went wrong. Try again.",
        variant: "default",
      });
    }
  };

  return {
    shareViaWhatsApp,
    shareViaTelegram,
    shareViaInstagram,
    shareMore,
    saveToLibrary,
  };
}
