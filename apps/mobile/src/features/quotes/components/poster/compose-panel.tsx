import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import { QuoteReplySheet } from "@/features/quotes/components/poster/quote-reply-sheet";

const WRITE_ICON = { android: "edit", ios: "pencil" } as const;

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
	const ink = useCSSVariable("--color-poster-ink") as string;
	const [isReplySheetOpen, setReplySheetOpen] = useState(false);
	// Once per mount: refocusing is the same attempt, and `quote_replied` needs a denominator.
	const startedRef = useRef(false);
	const openReply = () => {
		Presets.flick();
		if (!startedRef.current) {
			startedRef.current = true;
			posthog.capture("quote_reply_started", { is_edit: reply !== undefined });
		}
		setReplySheetOpen(true);
	};

	if (reply !== undefined) {
		return (
			<>
				<SentPanel
					flagged={flagged}
					onEdit={openReply}
					onOpenResources={() =>
						router.push("/crisis-resources?from=quote_reply")
					}
					reachSubline={reachSubline}
					remembered={remembered}
					reply={reply}
				/>
				<QuoteReplySheet
					isOpen={isReplySheetOpen}
					isSending={isSending}
					onOpenChange={setReplySheetOpen}
					onSend={onSend}
					reply={reply}
				/>
			</>
		);
	}

	return (
		<>
			<PressableFeedback
				accessibilityHint="Open a private reply sheet"
				accessibilityLabel="Write a reply"
				accessibilityRole="button"
				onPress={openReply}
			>
				<GlassSurface
					className="flex-row items-center justify-between px-4 py-4"
					interactive
					radius={20}
				>
					<View>
						<AppText className="font-poster-display text-[19px] text-poster-ink">
							WRITE A REPLY
						</AppText>
						<AppText className="mt-1 text-[13px] text-poster-ink-soft">
							Keep the quote in view while you write.
						</AppText>
					</View>
					<SymbolView name={WRITE_ICON} size={20} tintColor={ink} />
				</GlassSurface>
			</PressableFeedback>
			<QuoteReplySheet
				isOpen={isReplySheetOpen}
				isSending={isSending}
				onOpenChange={setReplySheetOpen}
				onSend={onSend}
			/>
		</>
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
