import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useCSSVariable } from "uniwind";
import { GlassSurface } from "@/components/shared/glass-surface";
import { QuoteReplySheet } from "@/features/quotes/components/poster/quote-reply-sheet";

const WRITE_ICON = { android: "edit", ios: "pencil" } as const;
const CHECK_ICON = { android: "check", ios: "checkmark" } as const;

/** A compact reply entry point: the quote stays fixed while the actual writing happens in a sheet. */
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
	const [isOpen, setOpen] = useState(false);
	const startedRef = useRef(false);

	const open = () => {
		Presets.flick();
		if (!startedRef.current) {
			startedRef.current = true;
			posthog.capture("quote_reply_started", { is_edit: reply !== undefined });
		}
		setOpen(true);
	};

	return (
		<>
			<PressableFeedback
				accessibilityHint="Open a private reply sheet"
				accessibilityLabel={reply === undefined ? "Write a reply" : "View your reply"}
				accessibilityRole="button"
				onPress={open}
			>
				<GlassSurface
					className="h-13 w-13 items-center justify-center"
					interactive
					radius={26}
					tint={reply === undefined ? undefined : "accent"}
				>
					<SymbolView
						name={reply === undefined ? WRITE_ICON : CHECK_ICON}
						size={19}
						tintColor={ink}
					/>
				</GlassSurface>
			</PressableFeedback>

			<QuoteReplySheet
				flagged={flagged}
				isOpen={isOpen}
				isSending={isSending}
				onOpenChange={setOpen}
				onOpenResources={() => router.push("/crisis-resources?from=quote_reply")}
				onSend={onSend}
				reachSubline={reachSubline}
				remembered={remembered}
				reply={reply}
			/>
		</>
	);
}
