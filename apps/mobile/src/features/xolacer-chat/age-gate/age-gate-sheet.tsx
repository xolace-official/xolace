import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AskStep, RefusalStep } from "./age-gate-steps";
import type { AgeGate } from "./use-age-gate";

/** The age gate's one sheet: the date-of-birth question, then wherever its answer leads. */
export function AgeGateSheet({ gate }: { gate: AgeGate }) {
	const { height: screenHeight } = useWindowDimensions();

	return (
		<BottomSheet
			isOpen={gate.step !== null}
			onOpenChange={(open) => {
				if (!open) {
					gate.close();
				}
			}}
		>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
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
						<View className="pb-2">
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
