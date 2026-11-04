import { useToast } from "heroui-native";
import { useEffect } from "react";
import type {
	ReflectionAction,
	ReflectionStateName,
} from "@/features/reflect/types";
import { useAppStore } from "@/store/store";

/**
 * Sets `reflectSettled` for the starter bubble and `homeComposing` for the badge unlock; opens
 * the composer on request (#462), with words if the request carries them, or toasts.
 */
export function useReflectBridge(
	screen: ReflectionStateName,
	wordsPicked: boolean,
	/** An unsent draft is on the card: a pickup's words never replace it. */
	hasDraft: boolean,
	isLoading: boolean,
	dispatch: (action: ReflectionAction) => void
) {
	const setSettled = useAppStore((s) => s.setReflectSettled);
	// The starter bubble waits for this, so it never arrives over the loader or
	// ahead of the card's own 400ms fade-in.
	useEffect(() => {
		if (isLoading) {
			return;
		}
		const t = setTimeout(() => setSettled(true), 500);
		return () => {
			clearTimeout(t);
			setSettled(false);
		};
	}, [isLoading, setSettled]);

	// Not just the compose screens: dropping the hold at submit would open a held badge over
	// processing, or over the error screen, whenever the session lands later than the settle.
	// Picking words on the idle card is a reflection started too; clearing them lets it go.
	const setComposing = useAppStore((s) => s.setHomeComposing);
	const composing = screen !== "idle" || wordsPicked;
	useEffect(() => {
		setComposing(composing);
		return () => setComposing(false);
	}, [composing, setComposing]);

	const requested = useAppStore((s) => s.composerOpenRequested);
	const text = useAppStore((s) => s.composerOpenText);
	const clear = useAppStore((s) => s.clearComposerOpenRequest);
	const { toast } = useToast();

	useEffect(() => {
		if (!requested) {
			return;
		}
		clear();
		if (screen === "idle") {
			dispatch({ type: "TAP_INPUT" });
			// Intake v2's "Pick up where you left off" (#707): their words, ready to send,
			// unless a kept draft (#258) is already there; theirs wins.
			if (text && hasDraft) {
				toast.show({ label: "Your draft is still here" });
			} else if (text) {
				dispatch({ text, type: "TEXT_CHANGE" });
			}
		} else if (screen !== "typing" && screen !== "typing-nudge") {
			toast.show({ label: "Tap the card to start reflecting" });
		}
	}, [requested, text, screen, hasDraft, dispatch, clear, toast]);
}
