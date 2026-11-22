import { useEffect, useEffectEvent } from "react";
import { toast } from "@/components/shared/toast";
import { useAppStore } from "@/store/store";
import { COPY } from "../copy";
import type { ReflectionStateName } from "./types";

const isWriting = (screen: ReflectionStateName) =>
	screen === "idle" || screen === "typing" || screen === "typing-nudge";

export function useReflectBridge(
	screen: ReflectionStateName,
	composing: boolean,
	hasDraft: boolean
) {
	const setComposing = useAppStore((s) => s.setHomeComposing);
	useEffect(() => {
		setComposing(composing);
		return () => setComposing(false);
	}, [composing, setComposing]);

	const replySeed = useAppStore((s) => s.replySeed);
	const clearReplySeed = useAppStore((s) => s.clearReplySeed);
	const keepDraft = useEffectEvent(() => {
		if (hasDraft && isWriting(screen)) {
			clearReplySeed();
			toast(COPY.write.draftStillHere);
		}
	});
	useEffect(() => {
		if (replySeed) {
			keepDraft();
		}
	}, [replySeed]);
	useEffect(() => {
		if (replySeed && !isWriting(screen) && screen !== "processing") {
			clearReplySeed();
		}
	}, [replySeed, screen, clearReplySeed]);
	const leave = useEffectEvent(() => {
		if (isWriting(screen)) {
			clearReplySeed();
		}
	});
	useEffect(() => () => leave(), []);
}
