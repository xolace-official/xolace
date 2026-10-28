import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import type { LayoutChangeEvent, ViewInstance } from "react-native";
import { PixelRatio, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";

// Export width in device pixels; height follows the twin's aspect (#317). Both
// natives ignore `width` without `height`, and iOS multiplies by the device scale.
const EXPORT_WIDTH_PX = 1080;

const exportWidth = Math.round(
	Platform.OS === "ios" ? EXPORT_WIDTH_PX / PixelRatio.get() : EXPORT_WIDTH_PX
);

export function useQuoteSharing(
	displayedQuote: { text: string; type: "session" | "curated" } | null
) {
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

	// Off-screen wrapper's onLayout: hands over the twin's size so the export keeps its aspect.
	const onSharingCardLayout = (e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		if (width > 0 && height > 0) {
			cardSizeRef.current = { height, width };
		}
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
		if (!displayedQuote || isSharingLoading) {
			return;
		}
		posthog.capture("quote_share_initiated", {
			quote_type: displayedQuote.type,
		});
		setIsSharingLoading(true);
		imageLoadedRef.current = false;
		setShowSharingCard(true);
		try {
			await new Promise<void>((resolve) => {
				layoutResolverRef.current = resolve;
				layoutTimeoutRef.current = setTimeout(() => {
					layoutTimeoutRef.current = null;
					layoutResolverRef.current = null;
					resolve();
				}, 4000);
			});

			// Wait for the mascot and the fit search; cut short, the export is blank (#317).
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
							height: Math.round(exportWidth * (size.height / size.width)),
							width: exportWidth,
						}
					: null),
			});
			setShareImageUri(uri);
			setShowShareSheet(true);
		} catch {
			toast.show({
				description: "Something went wrong. Try again.",
				label: "Couldn't prepare image",
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
		isSharingLoading,
		onSharingCardImageLoadEnd,
		onSharingCardLayout,
		setShareImageUri,
		setShowShareSheet,
		shareImageUri,
		sharingCardRef,
		showShareSheet,
		showSharingCard,
	};
}
