import { useEffect } from "react";
import type {
	ReflectionAction,
	ReflectionStateName,
} from "@/features/reflect/types";
import { useAppStore } from "@/store/store";

/**
 * A reply seed (#316) opens the composer on arrival; leaving compose any other way spends it.
 */
export function useReplySeed(
	screen: ReflectionStateName,
	dispatch: (action: ReflectionAction) => void
) {
	const replySeed = useAppStore((s) => s.replySeed);
	const clearReplySeed = useAppStore((s) => s.clearReplySeed);

	useEffect(() => {
		if (!replySeed) {
			return;
		}
		if (screen === "idle") {
			dispatch({ type: "TAP_INPUT" });
			return;
		}
		if (screen !== "typing" && screen !== "typing-nudge") {
			clearReplySeed();
		}
	}, [replySeed, screen, dispatch, clearReplySeed]);
}
