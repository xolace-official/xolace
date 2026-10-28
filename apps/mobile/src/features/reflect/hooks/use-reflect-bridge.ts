import { useToast } from "heroui-native";
import { useEffect } from "react";
import type {
	ReflectionAction,
	ReflectionStateName,
} from "@/features/reflect/types";
import { useAppStore } from "@/store/store";

/**
 * The reflect screen's link to what is laid over home (the starter bubble).
 *
 * Out: `reflectSettled`, once the screen has loaded and its card has arrived.
 *
 * In: a request to open the card (#462). From idle it opens the composer the
 * way a tap would; already composing, there is nothing to do; anywhere else
 * the card is not there to open, so the user is told how to get to it rather
 * than left with nothing happening. Spent either way.
 */
export function useReflectBridge(
	screen: ReflectionStateName,
	isLoading: boolean,
	dispatch: (action: ReflectionAction) => void
) {
	const setSettled = useAppStore((s) => s.setReflectSettled);
	// Anything laid over home (the starter bubble) waits for this, so it never
	// arrives over the loader or ahead of the card's own 400ms fade-in.
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

	const requested = useAppStore((s) => s.composerOpenRequested);
	const clear = useAppStore((s) => s.clearComposerOpenRequest);
	const { toast } = useToast();

	useEffect(() => {
		if (!requested) {
			return;
		}
		clear();
		if (screen === "idle") {
			dispatch({ type: "TAP_INPUT" });
		} else if (screen !== "typing" && screen !== "typing-nudge") {
			toast.show({ label: "Tap the card to start reflecting" });
		}
	}, [requested, screen, dispatch, clear, toast]);
}
