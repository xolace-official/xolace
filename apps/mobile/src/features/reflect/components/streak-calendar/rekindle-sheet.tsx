import { BottomSheet, PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AppText } from "@/components/shared/app-text";

type Props = {
	isOpen: boolean;
	streak: number;
	onRekindle: () => void;
	onClose: () => void;
};

/**
 * The one ask for a revive (#437). No clock; when the window closes the offer simply isn't there.
 */
export const RekindleSheet = ({
	isOpen,
	streak,
	onRekindle,
	onClose,
}: Props) => {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					accessible={false}
					backgroundClassName="rounded-[32px] bg-overlay"
					bottomInset={insets.bottom + 12}
					className="mx-4"
					detached
					enableOverDrag={false}
					handleIndicatorClassName="opacity-0"
				>
					<View className="items-center px-6 pt-3 pb-7">
						<BottomSheet.Title className="text-center font-serif text-2xl text-foreground">
							The embers are still warm
						</BottomSheet.Title>
						<BottomSheet.Description className="mt-3 text-center text-[15px] text-foreground/65 leading-6">
							{`Your ${streak}-day streak went quiet. You can rekindle it until tonight.`}
						</BottomSheet.Description>

						<PressableFeedback
							accessibilityLabel="Use 1 streak saver"
							accessibilityRole="button"
							className="mt-7 h-13 w-full items-center justify-center rounded-2xl bg-accent"
							onPress={onRekindle}
						>
							<AppText className="font-[Poppins-Medium] text-accent-foreground text-base">
								Use 1 streak saver
							</AppText>
						</PressableFeedback>
						<PressableFeedback
							accessibilityLabel="Not now"
							accessibilityRole="button"
							className="mt-2 h-12 w-full items-center justify-center rounded-2xl"
							onPress={onClose}
						>
							<AppText className="text-base text-foreground/65">
								Not now
							</AppText>
						</PressableFeedback>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
};
