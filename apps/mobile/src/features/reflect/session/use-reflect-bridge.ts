import { useEffect, useRef } from "react";
import { toast } from "@/components/shared/toast";
import { useAppStore } from "@/store/store";
import { COPY } from "../copy";
import type { ReflectionStateName } from "./types";

const isWriting = (screen: ReflectionStateName) =>
	screen === "idle" || screen === "typing" || screen === "typing-nudge";

/**
 * Reflect's seams with the rest of the app, as production had them: `homeComposing` to hold
 * the badge unlock while `composing`, and the quote-reply seed (#316).
 */
export function useReflectBridge(
	screen: ReflectionStateName,
	composing: boolean,
	hasDraft: boolean
) {
	// `homeComposing` holds a badge arrival over Reflect (`use-arrivals.ts`).
	const setComposing = useAppStore((s) => s.setHomeComposing);
	useEffect(() => {
		setComposing(composing);
		return () => setComposing(false);
	}, [composing, setComposing]);

	// A reply seed is spent once Reflect leaves writing any way but sending, closing included:
	// left while still writing, it would greet the next open with a reply nobody is making.
	const replySeed = useAppStore((s) => s.replySeed);
	const clearReplySeed = useAppStore((s) => s.clearReplySeed);
	// A seed (a quote, a moment) that lands on a kept draft would set its question over words it
	// isn't about: the draft wins. Checked once per seed, on arrival (the draft is read at
	// mount), so typing under an accepted seed never clears it.
	const seen = useRef<string | null>(null);
	useEffect(() => {
		if (!replySeed) {
			seen.current = null;
			return;
		}
		if (seen.current === replySeed) {
			return;
		}
		seen.current = replySeed;
		if (hasDraft && isWriting(screen)) {
			clearReplySeed();
			toast(COPY.write.draftStillHere);
		}
	}, [replySeed, hasDraft, screen, clearReplySeed]);
	useEffect(() => {
		if (replySeed && !isWriting(screen) && screen !== "processing") {
			clearReplySeed();
		}
	}, [replySeed, screen, clearReplySeed]);
	const latest = useRef(screen);
	useEffect(() => {
		latest.current = screen;
	});
	useEffect(
		() => () => {
			if (isWriting(latest.current)) {
				clearReplySeed();
			}
		},
		[clearReplySeed]
	);
}
