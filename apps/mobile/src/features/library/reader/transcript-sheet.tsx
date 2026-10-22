/**
 * What the narration says, as plain text (CONTEXT.md "Library: transcript") —
 * not a synced caption, not the entry body. Plus only: the dock never opens
 * it during the preview, and the server read is behind `requirePremium`.
 */
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { BottomSheet } from "heroui-native";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";

type Props = {
	entryId: Id<"library_entries">;
	isOpen: boolean;
	onClose: () => void;
};

export function TranscriptSheet({ entryId, isOpen, onClose }: Props) {
	const { height } = useWindowDimensions();
	const text = useQuery(
		api.library.audio.getTranscript,
		isOpen ? { entryId } : "skip"
	);
	return (
		<BottomSheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					// gorhom makes the sheet one accessible element, which reads the title and text as one blob.
					accessible={false}
					backgroundClassName="bg-background"
					enableDynamicSizing
					handleIndicatorClassName="bg-foreground/20"
				>
					<AppText className="px-6 pt-2 pb-3 text-muted text-xs uppercase tracking-widest">
						Transcript
					</AppText>
					<BottomSheetScrollView
						contentContainerStyle={{ paddingBottom: 48 }}
						style={{ maxHeight: height * 0.7 }}
					>
						{text === undefined ? (
							<View className="py-8">
								<ActivityIndicator />
							</View>
						) : (
							<AppText
								className="px-6 text-base text-foreground leading-7"
								selectable
							>
								{text ?? "No transcript for this one yet."}
							</AppText>
						)}
					</BottomSheetScrollView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
