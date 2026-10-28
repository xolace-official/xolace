import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { Platform } from "react-native";
import { Presets } from "react-native-pulsar";
import RNShare, { Social } from "react-native-share";

// Required for Instagram Stories since Jan 2023; unset disables Stories sharing.
const FB_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID ?? "";

export function useQuoteShareActions(
	imageUri: string | null,
	quoteType: "session" | "curated"
) {
	const { toast } = useToast();
	const posthog = usePostHog();

	const shareGeneric = async () => {
		if (!imageUri) {
			return;
		}
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
				description: "Something went wrong. Try again.",
				label: "Couldn't share image",
				variant: "default",
			});
		}
	};

	const shareViaWhatsApp = async () => {
		Presets.flick();
		if (!imageUri) {
			return;
		}
		posthog.capture("quote_shared", {
			platform: "whatsapp",
			quote_type: quoteType,
		});
		// WhatsApp's iOS URL scheme silently ignores files; the UI hides this on iOS.
		if (Platform.OS === "ios") {
			await shareGeneric();
			return;
		}
		try {
			await RNShare.shareSingle({
				social: Social.Whatsapp,
				type: "image/png",
				url: imageUri,
			});
		} catch {
			await shareGeneric();
		}
	};

	const shareViaTelegram = async () => {
		Presets.flick();
		if (!imageUri) {
			return;
		}
		posthog.capture("quote_shared", {
			platform: "telegram",
			quote_type: quoteType,
		});
		// Telegram's iOS URL scheme pastes the file path as text; the UI hides this on iOS.
		if (Platform.OS === "ios") {
			await shareGeneric();
			return;
		}
		try {
			await RNShare.shareSingle({
				social: Social.Telegram,
				type: "image/png",
				url: imageUri,
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
		if (!imageUri) {
			return;
		}
		posthog.capture("quote_shared", {
			platform: "instagram",
			quote_type: quoteType,
		});

		// Instagram Feed on iOS reads the latest camera-roll item, not the URL, so save first.
		if (Platform.OS === "ios" && !FB_APP_ID) {
			try {
				const { status } = await MediaLibrary.requestPermissionsAsync(false);
				if (status !== "granted") {
					toast.show({
						description:
							"Allow photo access so we can hand the image to Instagram.",
						label: "Photo access needed",
						variant: "default",
					});
					await shareGeneric();
					return;
				}
				await createMediaAsset(imageUri);
				toast.show({
					description: "Opening Instagram…",
					label: "Saved to Photos",
					variant: "default",
				});
				// Lets the toast render before the app switches to Instagram.
				await new Promise<void>((r) => setTimeout(r, 700));
				await RNShare.shareSingle({
					social: Social.Instagram,
					type: "image/*",
					url: imageUri,
				});
			} catch {
				await shareGeneric();
			}
			return;
		}

		try {
			if (FB_APP_ID) {
				await RNShare.shareSingle({
					appId: FB_APP_ID,
					backgroundImage: imageUri,
					social: Social.InstagramStories,
				});
			} else {
				await RNShare.shareSingle({
					social: Social.Instagram,
					type: "image/*",
					url: imageUri,
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
		if (!imageUri) {
			return;
		}
		Presets.flick();
		posthog.capture("quote_shared", {
			platform: "save_to_library",
			quote_type: quoteType,
		});
		const { status } = await MediaLibrary.requestPermissionsAsync(false);
		if (status !== "granted") {
			toast.show({
				description: "Allow photo access in Settings to save images.",
				label: "Permission denied",
				variant: "default",
			});
			return;
		}
		try {
			await createMediaAsset(imageUri);
			toast.show({ label: "Saved to Photos", variant: "default" });
		} catch {
			toast.show({
				description: "Something went wrong. Try again.",
				label: "Couldn't save image",
				variant: "default",
			});
		}
	};

	return {
		saveToLibrary,
		shareMore,
		shareViaInstagram,
		shareViaTelegram,
		shareViaWhatsApp,
	};
}
