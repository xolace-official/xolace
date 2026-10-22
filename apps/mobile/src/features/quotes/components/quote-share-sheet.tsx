import { GlassView } from "expo-glass-effect";
import { Image, type ImageLoadEventData } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { useState } from "react";
import {
	Modal,
	Platform,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/shared/app-text";
import { useQuoteShareActions } from "@/src/features/quotes/hooks/use-quote-share-actions";
import { QuickAction } from "./quick-action";
import { SocialIcon } from "./social-icon";

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
				{ android: "photo_camera", ios: "camera.fill", label: "Instagram" },
				{ android: "more_horiz", ios: "ellipsis", label: "More" },
			]
		: [
				{ android: "chat", ios: "bubble.left.fill", label: "WhatsApp" },
				{ android: "send", ios: "paperplane.fill", label: "Telegram" },
				{ android: "photo_camera", ios: "camera.fill", label: "Instagram" },
				{ android: "more_horiz", ios: "ellipsis", label: "More" },
			]
) as readonly { label: string; ios: string; android: string }[];

const GRADIENT_TOP_START: [number, number] = [0, 0];
const GRADIENT_TOP_END: [number, number] = [1, 0.4];
const CLOSE_ICON = { android: "close" as const, ios: "xmark" as const };

export function QuoteShareSheet({
	visible,
	imageUri,
	quoteType,
	onClose,
}: Props) {
	const { top, bottom } = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const foregroundColor = useThemeColor("foreground") as string;
	const backgroundColor = useThemeColor("background") as string;
	const surfaceColor = useThemeColor("surface") as string;
	const accentColor = useThemeColor("accent") as string;
	const {
		shareViaWhatsApp,
		shareViaTelegram,
		shareViaInstagram,
		shareMore,
		saveToLibrary,
	} = useQuoteShareActions(imageUri, quoteType);

	// The poster has no chosen frame — its aspect is whatever the hero's own
	// geometry comes to (#317) — so the preview takes the exported image's aspect
	// rather than a fixed 9:16 box that crops the title and the wordmark off.
	const [aspect, setAspect] = useState<number | null>(null);
	const previewWidth = width * 0.72;
	const previewHeight = aspect
		? previewWidth / aspect
		: previewWidth * (16 / 9);

	const backdropStyle = { backgroundColor };
	const gradientTopColors: [string, string] = [
		`${accentColor}18`,
		"transparent",
	];
	const gradientBottomColors: [string, string] = [
		"transparent",
		`${accentColor}22`,
	];
	const headerStyle = { paddingBottom: 20, paddingTop: top + 16 };
	const glassStyle = {
		alignItems: "center" as const,
		backgroundColor: `${foregroundColor}0D`,
		borderRadius: 20,
		height: 40,
		justifyContent: "center" as const,
		width: 40,
	};
	const shareLabelStyle = { color: `${foregroundColor}60` };
	const previewContainerStyle = {
		backgroundColor: surfaceColor,
		borderRadius: 20,
		height: previewHeight,
		overflow: "hidden" as const,
		width: previewWidth,
	};
	const preparingTextStyle = { color: `${foregroundColor}40` };
	const imageSource = { uri: imageUri ?? "" };
	const socialRowStyle = { marginTop: 28, paddingBottom: bottom + 40 };

	return (
		<Modal
			animationType="slide"
			onRequestClose={onClose}
			statusBarTranslucent
			transparent
			visible={visible}
		>
			<View className="flex-1" style={backdropStyle}>
				{/* Gradient layers — give GlassView content to refract */}
				<LinearGradient
					colors={gradientTopColors}
					end={GRADIENT_TOP_END}
					pointerEvents="none"
					start={GRADIENT_TOP_START}
					style={styles.gradientTop}
				/>
				<LinearGradient
					colors={gradientBottomColors}
					pointerEvents="none"
					style={styles.gradientBottom}
				/>

				{/* Header */}
				<View
					className="flex-row items-center justify-between px-6"
					style={headerStyle}
				>
					<PressableFeedback
						accessibilityLabel="Close"
						hitSlop={12}
						onPress={onClose}
					>
						<GlassView glassEffectStyle="clear" style={glassStyle}>
							<SymbolView
								name={CLOSE_ICON}
								size={15}
								tintColor={`${foregroundColor}70`}
							/>
						</GlassView>
					</PressableFeedback>
					<AppText className="font-medium text-sm" style={shareLabelStyle}>
						Share
					</AppText>
					<View style={styles.spacer} />
				</View>

				{/* Image preview */}
				<View className="items-center">
					<View style={previewContainerStyle}>
						{imageUri ? (
							<Image
								contentFit="contain"
								onLoad={(e: ImageLoadEventData) =>
									setAspect(e.source.width / e.source.height)
								}
								source={imageSource}
								style={styles.previewImage}
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
						androidIcon="save_alt"
						foregroundColor={foregroundColor}
						iosIcon="square.and.arrow.down"
						label="Save"
						onPress={saveToLibrary}
					/>
					<QuickAction
						androidIcon="share"
						foregroundColor={foregroundColor}
						iosIcon="square.and.arrow.up"
						label="Share"
						onPress={shareMore}
					/>
				</View>

				{/* Social row */}
				<View className="flex-row justify-center gap-6" style={socialRowStyle}>
					{SOCIAL_ITEMS.map((item) => (
						<SocialIcon
							android={item.android}
							foregroundColor={foregroundColor}
							ios={item.ios}
							key={item.label}
							label={item.label}
							onPress={
								item.label === "WhatsApp"
									? shareViaWhatsApp
									: item.label === "Telegram"
										? shareViaTelegram
										: item.label === "Instagram"
											? shareViaInstagram
											: shareMore
							}
						/>
					))}
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	gradientBottom: {
		bottom: 0,
		height: 260,
		left: 0,
		position: "absolute",
		right: 0,
	},
	gradientTop: { height: 160, left: 0, position: "absolute", right: 0, top: 0 },
	previewImage: { height: "100%", width: "100%" },
	quickActionsRow: { marginTop: 28 },
	spacer: { width: 40 },
});
