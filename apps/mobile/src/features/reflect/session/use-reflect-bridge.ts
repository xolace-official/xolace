import { useEffect, useRef } from "react";
import { toast } from "@/components/shared/toast";
import { useAppStore } from "@/store/store";
import { COPY } from "../copy";
import type { ReflectionAction, ReflectionStateName } from "./types";

const SETTLE_MS = 500;
const isWriting = (screen: ReflectionStateName) =>
	screen === "idle" || screen === "typing" || screen === "typing-nudge";

/**
 * Reflect's seams with the rest of the app, as production had them: `reflectSettled` for the
 * starter bubble, `homeComposing` to hold the badge unlock while `composing`, a composer-open request (#462, #707) and
 * the quote-reply seed (#316). Reflect opens on its field, so a request only adds words.
 */
export function useReflectBridge(
	screen: ReflectionStateName,
	composing: boolean,
	hasDraft: boolean,
	isLoading: boolean,
	dispatch: (action: ReflectionAction) => void
) {
	const setSettled = useAppStore((s) => s.setReflectSettled);
	useEffect(() => {
		if (isLoading) {
			return;
		}
		const t = setTimeout(() => setSettled(true), SETTLE_MS);
		return () => {
			clearTimeout(t);
			setSettled(false);
		};
	}, [isLoading, setSettled]);

	// `homeComposing` holds a badge arrival over Reflect (`use-arrivals.ts`).
	const setComposing = useAppStore((s) => s.setHomeComposing);
	useEffect(() => {
		setComposing(composing);
		return () => setComposing(false);
	}, [composing, setComposing]);

	const requested = useAppStore((s) => s.composerOpenRequested);
	const text = useAppStore((s) => s.composerOpenText);
	const clear = useAppStore((s) => s.clearComposerOpenRequest);
	useEffect(() => {
		if (!requested) {
			return;
		}
		clear();
		if (!isWriting(screen)) {
			toast(COPY.write.tapToStart);
		} else if (text && hasDraft) {
			toast(COPY.write.draftStillHere);
		} else if (text) {
			dispatch({ text, type: "TEXT_CHANGE" });
		}
	}, [requested, text, screen, hasDraft, dispatch, clear]);

	// A reply seed is spent once Reflect leaves writing any way but sending, closing included:
	// left while still writing, it would greet the next open with a reply nobody is making.
	const replySeed = useAppStore((s) => s.replySeed);
	const clearReplySeed = useAppStore((s) => s.clearReplySeed);
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
