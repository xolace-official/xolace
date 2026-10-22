import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
	openBrowserAsync,
	WebBrowserPresentationStyle,
} from "expo-web-browser";
import { BottomSheet } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";
import type { LegalDocument } from "./legal-content";

type Props = {
	document: LegalDocument | null;
	onClose: () => void;
};

const SNAP_POINTS = ["90%"];

export const LegalBottomSheet = ({ document, onClose }: Props) => {
	const isOpen = document !== null;

	const handleOpenFull = async () => {
		if (!document) {
			return;
		}
		await openBrowserAsync(document.fullUrl, {
			presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
		});
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					accessible={false}
					backgroundClassName="bg-background"
					contentContainerClassName="h-full"
					enableDynamicSizing={false}
					enableOverDrag={false}
					handleIndicatorClassName="bg-foreground"
					snapPoints={SNAP_POINTS}
				>
					<BottomSheet.Close className="absolute top-4 right-4 z-10" />

					<BottomSheetScrollView
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						{document && (
							<>
								<AppText className="mb-6 text-[22px]" style={styles.fontMedium}>
									{document.title}
								</AppText>

								{document.sections.map((section) => (
									<View key={section.heading} style={styles.section}>
										<AppText
											className="mb-1 text-[14px]"
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
										className="text-center text-[12px]"
										onPress={handleOpenFull}
										style={styles.fontRegular}
									>
										This is a summary.{" "}
										<AppText className="text-[12px]" style={styles.underline}>
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
	fontMedium: { fontFamily: "Poppins-Medium" },
	fontRegular: { fontFamily: "Poppins-Regular" },
	// eslint-disable-next-line react-native/no-color-literals
	footer: {
		borderTopColor: "rgba(255,255,255,0.08)",
		borderTopWidth: 1,
		marginTop: 12,
		paddingTop: 20,
	},
	scrollContent: {
		paddingBottom: 48,
		paddingHorizontal: 24,
		paddingTop: 8,
	},
	section: { marginBottom: 20 },
	underline: { textDecorationLine: "underline" },
});
