import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { BottomSheet } from "heroui-native";
import { useState } from "react";
import { EaseView } from "react-native-ease/uniwind";
import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	swapsUsed: number;
	resetId: Id<"exercises"> | null;
	nextBestId: Id<"exercises"> | null;
	onKeepGoing: () => void;
	onSwap: (exerciseId: Id<"exercises">) => void | Promise<void>;
};

const SNAP_POINTS = ["40%"];
const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const CONTENT_TRANSITION = {
	duration: 300,
	easing: EASE,
	type: "timing",
} as const;

export function SwapSheet({
	isOpen,
	onOpenChange,
	swapsUsed,
	resetId,
	nextBestId,
	onKeepGoing,
	onSwap,
}: Props) {
	const canSwap = swapsUsed < 2;
	const [isSwapping, setIsSwapping] = useState(false);

	const handleSwapPress = async (exerciseId: Id<"exercises">) => {
		if (isSwapping) {
			return;
		}
		setIsSwapping(true);
		try {
			await onSwap(exerciseId);
		} catch {
			// swap errors are handled by the caller
		} finally {
			setIsSwapping(false);
		}
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					accessible={false}
					backgroundClassName="bg-background"
					enableDynamicSizing={false}
					enableOverDrag={false}
					handleIndicatorClassName="bg-foreground/30"
					snapPoints={SNAP_POINTS}
				>
					<EaseView
						animate={VISIBLE_FADE}
						className="gap-4 px-6 pt-2 pb-8"
						initialAnimate={INITIAL_FADE}
						transition={CONTENT_TRANSITION}
					>
						<AppText className="text-center font-medium text-base text-foreground/60">
							Something else?
						</AppText>

						<PillButton label="Keep going" onPress={onKeepGoing} />

						{canSwap && resetId && (
							<PillButton
								className="border border-accent/20 bg-transparent"
								disabled={isSwapping}
								label="Try something simpler"
								onPress={() => handleSwapPress(resetId)}
							/>
						)}

						{canSwap && nextBestId && (
							<PillButton
								className="border border-accent/20 bg-transparent"
								disabled={isSwapping}
								label="Try something else"
								onPress={() => handleSwapPress(nextBestId)}
							/>
						)}
					</EaseView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
