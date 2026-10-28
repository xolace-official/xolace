import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import type { TextInputInstance } from "react-native";
import { StyleSheet, TextInput, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";

/** Mirrors `REPLY_MAX_LENGTH` in convex/dailyQuotes.ts, which is the fence. */
const REPLY_MAX_LENGTH = 500;

/** The counter is noise until the cap is actually in reach. */
const COUNTER_FROM = REPLY_MAX_LENGTH - 80;

/** Reply composer on the deck card (#313): collapsed, composing, or sent (one reply per quote,
 * editable). On `--poster-*`, not themed chrome (#305). */
export function ComposePanel({
	reply,
	flagged,
	reachSubline,
	remembered,
	isSending,
	onSend,
}: {
	reply?: string;
	flagged: boolean;
	reachSubline: boolean;
	remembered: boolean;
	isSending: boolean;
	onSend: (text: string) => Promise<void>;
}) {
	const router = useRouter();
	const posthog = usePostHog();
	const inputRef = useRef<TextInputInstance>(null);
	const [draft, setDraft] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [focused, setFocused] = useState(false);
	// Once per mount: refocusing is the same attempt, and `quote_replied` needs a denominator.
	const startedRef = useRef(false);

	const [faint, ink] = useCSSVariable([
		"--color-poster-ink-faint",
		"--color-poster-ink",
	]) as string[];

	const trimmed = draft.trim();
	const composing = focused || trimmed.length > 0;
	const canSend = trimmed.length > 0 && !isSending;

	const handleSend = async () => {
		if (!canSend) {
			return;
		}
		Presets.flick();
		inputRef.current?.blur();
		try {
			await onSend(trimmed);
			setDraft("");
			setIsEditing(false);
		} catch {
			// The panel stays in composing with the text intact; the screen logs it.
		}
	};

	if (reply !== undefined && !isEditing) {
		return (
			<SentPanel
				flagged={flagged}
				onEdit={() => {
					Presets.flick();
					setDraft(reply);
					setIsEditing(true);
				}}
				onOpenResources={() =>
					router.push("/crisis-resources?from=quote_reply")
				}
				reachSubline={reachSubline}
				remembered={remembered}
				reply={reply}
			/>
		);
	}

	return (
		<View className="gap-2">
			{/* items-start: a bottom-aligned pill would grow down under the keyboard. */}
			<View className="flex-row items-start gap-2.5 rounded-[20px] bg-poster-field p-2.5">
				<TextInput
					accessibilityLabel="Reply to today's thought"
					maxLength={REPLY_MAX_LENGTH}
					multiline
					onBlur={() => setFocused(false)}
					onChangeText={setDraft}
					onFocus={() => {
						setFocused(true);
						if (!startedRef.current) {
							startedRef.current = true;
							posthog.capture("quote_reply_started", {
								is_edit: reply !== undefined,
							});
						}
					}}
					placeholder="What does this bring for you?"
					placeholderTextColor={faint}
					ref={inputRef}
					style={[styles.input, { color: ink, minHeight: composing ? 76 : 26 }]}
					value={draft}
				/>

				<View className="items-end gap-1">
					<PressableFeedback
						accessibilityLabel="Send reply"
						accessibilityRole="button"
						isDisabled={!canSend}
						onPress={handleSend}
					>
						<View
							className="h-9 items-center justify-center rounded-full bg-poster-send px-5"
							style={canSend ? undefined : styles.pillDim}
						>
							<AppText className="font-semibold text-[14px] text-poster-ink">
								{isSending ? "Sending" : "Share"}
							</AppText>
						</View>
					</PressableFeedback>
					{composing && trimmed.length >= COUNTER_FROM && (
						<AppText className="text-[11px] text-poster-ink-faint">
							{REPLY_MAX_LENGTH - draft.length}
						</AppText>
					)}
				</View>
			</View>

			{isEditing && (
				<View className="flex-row justify-end px-1">
					<PressableFeedback
						accessibilityLabel="Cancel editing"
						accessibilityRole="button"
						onPress={() => {
							setDraft("");
							setIsEditing(false);
						}}
					>
						<AppText className="text-[13px] text-poster-ink-soft underline">
							Cancel
						</AppText>
					</PressableFeedback>
				</View>
			)}
		</View>
	);
}

function SentPanel({
	reply,
	flagged,
	reachSubline,
	remembered,
	onEdit,
	onOpenResources,
}: {
	reply: string;
	flagged: boolean;
	reachSubline: boolean;
	remembered: boolean;
	onEdit: () => void;
	onOpenResources: () => void;
}) {
	return (
		<View className="gap-3">
			<View className="rounded-[20px] bg-poster-field px-4 py-3.5">
				<AppText className="text-[15px] text-poster-ink leading-[22px]">
					{reply}
				</AppText>
			</View>

			{flagged ? (
				// A flagged reply gets the offer, not a diagnosis (#313).
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
				<View className="px-1">
					<AppText className="font-poster-display text-[15px] text-poster-ink">
						KEPT SAFE
					</AppText>
					<AppText className="mt-0.5 text-[13px] text-poster-ink-soft leading-[19px]">
						{/* Reach and memory (#315) are independent; only a reply that reaches
						    neither is just kept. */}
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

			<View className="flex-row justify-end px-1">
				<PressableFeedback
					accessibilityLabel="Edit your reply"
					accessibilityRole="button"
					onPress={onEdit}
				>
					<AppText className="text-[13px] text-poster-ink-soft underline">
						Edit
					</AppText>
				</PressableFeedback>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	input: {
		flex: 1,
		fontSize: 15,
		lineHeight: 21,
		paddingBottom: 4,
		paddingHorizontal: 8,
		paddingTop: 4,
		textAlignVertical: "top",
	},
	pillDim: { opacity: 0.45 },
});
