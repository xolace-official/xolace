import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AskStep, RefusalStep } from "./age-gate-steps";
import type { AgeGate } from "./use-age-gate";

/** The age gate's one sheet: the date-of-birth question, then wherever its answer leads. */
export function AgeGateSheet({ gate }: { gate: AgeGate }) {
	const { height: screenHeight } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet
			isOpen={gate.step !== null}
			onOpenChange={(open) => {
				if (!open) {
					gate.close();
				}
			}}
		>
			{/* In the app's own window, not iOS's full-window overlay: the SwiftUI date wheel
			    can't attach its content inside that overlay and renders blank. */}
			<BottomSheet.Portal
				disableFullWindowOverlay
				unstable_accessibilityContainerViewIsModal
			>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					accessible={false}
					backgroundClassName="bg-background"
				>
					<BottomSheet.Close className="absolute top-0 right-4 z-10" />
					<BottomSheetScrollView
						showsVerticalScrollIndicator={false}
						style={{ maxHeight: screenHeight * 0.75 }}
					>
						{/* The buttons end the scroll view, so it clears the home indicator itself. */}
						<View style={{ paddingBottom: insets.bottom }}>
							{gate.step === "ask" && (
								<AskStep
									onChange={gate.setDateOfBirth}
									onContinue={gate.submit}
									onDecline={gate.decline}
									saving={gate.saving}
									value={gate.dateOfBirth}
								/>
							)}
							{gate.step !== null && gate.step !== "ask" && (
								<RefusalStep onClose={gate.close} step={gate.step} />
							)}
						</View>
					</BottomSheetScrollView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
