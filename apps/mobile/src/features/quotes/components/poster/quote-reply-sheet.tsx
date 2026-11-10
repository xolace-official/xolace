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
	flagged: boolean;
	isOpen: boolean;
	isSending: boolean;
	onOpenChange: (open: boolean) => void;
	onOpenResources: () => void;
	onSend: (text: string) => Promise<void>;
	reachSubline: boolean;
	remembered: boolean;
	reply?: string;
};

/** Reply state lives above the main composition, preserving the quote's geometry. */
export function QuoteReplySheet({
	flagged,
	isOpen,
	isSending,
	onOpenChange,
	onOpenResources,
	onSend,
	reachSubline,
	remembered,
	reply,
}: Props) {
	const inputRef = useRef<TextInputInstance>(null);
	const [draft, setDraft] = useState("");
	const [isEditing, setEditing] = useState(reply === undefined);
	const [faint, ink] = useCSSVariable([
		"--color-poster-ink-faint",
		"--color-poster-ink",
	]) as string[];
	const trimmed = draft.trim();
	const canSend = trimmed.length > 0 && !isSending;

	useEffect(() => {
		if (isOpen) {
			setDraft(reply ?? "");
			setEditing(reply === undefined);
		}
	}, [isOpen, reply]);

	const close = () => onOpenChange(false);
	const send = async () => {
		if (!canSend) {
			return;
		}
		try {
			await onSend(trimmed);
			setEditing(false);
		} catch {
			// Keep the draft in place when the existing write request does not complete.
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
						<BottomSheet.Title className="font-poster-display text-[24px] text-poster-ink">
							{isEditing ? "WRITE A REPLY" : "YOUR REPLY"}
						</BottomSheet.Title>

						{isEditing ? (
							<>
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
										onPress={() => {
											if (reply !== undefined) {
												setDraft(reply);
												setEditing(false);
												return;
											}
											close();
										}}
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
							</>
						) : (
							<ReplySavedState
								flagged={flagged}
								onEdit={() => setEditing(true)}
								onOpenResources={onOpenResources}
								reachSubline={reachSubline}
								remembered={remembered}
								reply={reply ?? draft}
							/>
						)}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function ReplySavedState({
	flagged,
	onEdit,
	onOpenResources,
	reachSubline,
	remembered,
	reply,
}: Omit<Props, "isOpen" | "isSending" | "onOpenChange" | "onSend"> & {
	onEdit: () => void;
}) {
	return (
		<View className="gap-4">
			<View className="rounded-[20px] bg-poster-field px-4 py-3.5">
				<AppText className="text-[15px] text-poster-ink leading-[22px]">
					{reply}
				</AppText>
			</View>
			{flagged ? (
				<View className="rounded-[20px] border border-poster-hairline px-4 py-3.5">
					<AppText className="text-[14px] text-poster-ink leading-[21px]">
						That sounds heavy to be carrying alone.
					</AppText>
					<PressableFeedback
						accessibilityLabel="See support resources"
						accessibilityRole="button"
						onPress={onOpenResources}
					>
						<AppText className="mt-2 font-semibold text-[14px] text-poster-ink underline">
							Support is here if you want it →
						</AppText>
					</PressableFeedback>
				</View>
			) : (
				<View>
					<AppText className="font-poster-display text-[15px] text-poster-ink">
						KEPT SAFE
					</AppText>
					<AppText className="mt-1 text-[13px] text-poster-ink-soft leading-[19px]">
						{reachSubline && remembered
							? "Tomorrow's thought will listen. It stays in what Xolace knows of you."
							: reachSubline
								? "Tomorrow's thought will listen to what you just said."
								: remembered
									? "Yours only — and it stays in what Xolace knows of you."
									: "This stays yours."}
					</AppText>
				</View>
			)}
			<PressableFeedback
				accessibilityLabel="Edit your reply"
				accessibilityRole="button"
				onPress={onEdit}
			>
				<AppText className="self-end py-2 text-[14px] text-poster-ink-soft underline">
					Edit
				</AppText>
			</PressableFeedback>
		</View>
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
