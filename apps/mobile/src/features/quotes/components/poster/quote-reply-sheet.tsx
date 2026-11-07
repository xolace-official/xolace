import { BottomSheet, PressableFeedback } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import type { TextInputInstance } from "react-native";
import { StyleSheet, TextInput, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";

const REPLY_MAX_LENGTH = 500;
const SNAP_POINTS = ["58%"];

type Props = {
	isOpen: boolean;
	isSending: boolean;
	onOpenChange: (open: boolean) => void;
	onSend: (text: string) => Promise<void>;
	reply?: string;
};

/** Keeps the poster fixed while a reply is written or edited. */
export function QuoteReplySheet({
	isOpen,
	isSending,
	onOpenChange,
	onSend,
	reply,
}: Props) {
	const inputRef = useRef<TextInputInstance>(null);
	const [draft, setDraft] = useState(reply ?? "");
	const [faint, ink] = useCSSVariable([
		"--color-poster-ink-faint",
		"--color-poster-ink",
	]) as string[];
	const trimmed = draft.trim();
	const canSend = trimmed.length > 0 && !isSending;

	useEffect(() => {
		if (isOpen) {
			setDraft(reply ?? "");
		}
	}, [isOpen, reply]);

	const close = () => {
		onOpenChange(false);
	};

	const send = async () => {
		if (!canSend) {
			return;
		}
		try {
			await onSend(trimmed);
			close();
		} catch {
			// Keep the draft visible so a temporary write error never loses it.
		}
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					backgroundClassName="bg-poster-deck"
					enableDynamicSizing={false}
					enableOverDrag={false}
					handleIndicatorClassName="bg-poster-ink/25"
					snapPoints={SNAP_POINTS}
				>
					<View className="flex-1 gap-4 px-5 pt-2 pb-8">
						<View>
							<BottomSheet.Title className="font-poster-display text-[24px] text-poster-ink">
								{reply === undefined ? "WRITE A REPLY" : "YOUR REPLY"}
							</BottomSheet.Title>
							<BottomSheet.Description className="mt-1 text-[13px] text-poster-ink-soft">
								Your response stays yours.
							</BottomSheet.Description>
						</View>

						<View className="min-h-36 flex-1 rounded-[20px] bg-poster-field p-3">
							<TextInput
								autoFocus
								accessibilityLabel="Reply to today's thought"
								maxLength={REPLY_MAX_LENGTH}
								multiline
								onChangeText={setDraft}
								placeholder="What does this bring for you?"
								placeholderTextColor={faint}
								ref={inputRef}
								style={[styles.input, { color: ink }]}
								value={draft}
							/>
						</View>

						<View className="flex-row items-center justify-between gap-3">
							<PressableFeedback
								accessibilityLabel="Cancel reply"
								accessibilityRole="button"
								onPress={close}
							>
								<AppText className="px-2 py-3 font-medium text-[14px] text-poster-ink-soft underline">
									Cancel
								</AppText>
							</PressableFeedback>
							<PressableFeedback
								accessibilityLabel="Save reply"
								accessibilityRole="button"
								isDisabled={!canSend}
								onPress={send}
							>
								<GlassSurface
									className="px-5 py-3"
									interactive
									radius={22}
								>
									<AppText className="font-semibold text-[14px] text-poster-ink">
										{isSending ? "Sharing" : "Share"}
									</AppText>
								</GlassSurface>
							</PressableFeedback>
						</View>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

const styles = StyleSheet.create({
	input: {
		fontSize: 16,
		lineHeight: 24,
		minHeight: 130,
		padding: 0,
		textAlignVertical: "top",
	},
});
