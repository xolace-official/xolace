import { useEffect, useRef } from "react";
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
