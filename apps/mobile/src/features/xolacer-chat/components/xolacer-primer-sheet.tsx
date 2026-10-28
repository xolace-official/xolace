import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { SymbolViewProps } from "expo-symbols";
import { BottomSheet, Button } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { Fact } from "./fact-row";

/**
 * The four things a seeker needs to hold before they ask. Deliberately not
 * split into a constants module: this sheet is the only place they render, so
 * a second file would be a second source to keep honest.
 */
const LINES: { id: string; icon: SymbolViewProps["name"]; body: string }[] = [
	{
		body: "A real person, not a therapist. They choose whether to accept, it may not be right away and replies won’t always be quick. No diagnoses, no clinical advice.",
		icon: { android: "person", ios: "person", web: "person" },
		id: "peer",
	},
	{
		body: "You’re in control. Block or report from the menu any time. Blocking is permanent, the conversation can’t be reopened.",
		icon: { android: "front_hand", ios: "hand.raised", web: "front_hand" },
		id: "control",
	},
	{
		body: "Rating comes later. After you’ve talked for a while, you can rate them once from their profile. Only you and Xolace see it.",
		icon: { android: "star", ios: "star", web: "star" },
		id: "rating",
	},
	{
		body: "It’s one person listening to another. Meet them the way you’d want to be met. Something urgent? Crisis resources are one tap away in every chat.",
		icon: { android: "favorite", ios: "heart", web: "favorite" },
		id: "decency",
	},
];

/**
 * The Xolacer primer. Gate mode (`onConfirm` given) is the one-time sheet
 * before a seeker's first request — its button both acknowledges and sends, so
 * one decision costs one tap. Without `onConfirm` it is the same content opened
 * from the profile as reference, where there is nothing to confirm and the
 * close button is the only way out. Dismissal sends nothing either way.
 */
export function XolacerPrimerSheet({
	isOpen,
	onClose,
	onConfirm,
	isConfirming,
}: {
	isOpen: boolean;
	onClose: () => void;
	onConfirm?: () => void;
	isConfirming?: boolean;
}) {
	const { height: screenHeight } = useWindowDimensions();

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
					backgroundClassName="bg-background"
				>
					<BottomSheet.Close className="absolute top-0 right-4 z-10" />

					<BottomSheetScrollView
						showsVerticalScrollIndicator={false}
						style={{ maxHeight: screenHeight * 0.6 }}
					>
						<View className="gap-2 pr-10 pb-6">
							<BottomSheet.Title className="text-left font-semibold text-[22px] text-foreground">
								Before you ask
							</BottomSheet.Title>
							<BottomSheet.Description className="text-left text-[13px] text-muted leading-5">
								A quick note on how talking with a Xolacer works.
							</BottomSheet.Description>
						</View>

						<View className="gap-4 pb-7">
							{LINES.map((line) => (
								<Fact icon={line.icon} key={line.id}>
									{line.body}
								</Fact>
							))}
						</View>
					</BottomSheetScrollView>

					{onConfirm && (
						<Button isDisabled={isConfirming} onPress={onConfirm}>
							{isConfirming ? "Sending…" : "I understand, send request"}
						</Button>
					)}
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
