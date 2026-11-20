import { useEffect, useEffectEvent } from "react";
import type { ScrollTarget } from "@/features/you/home/you-ui";

export const SCROLL_AFTER_MS = 220;

type Command = { target: ScrollTarget; key: number } | null;

/** Runs `scroll` once per command; later changes to what `scroll` reads don't replay it. */
export function useScrollCommand(
	command: Command,
	scroll: (target: ScrollTarget) => void
) {
	const scrollNow = useEffectEvent(scroll);
	useEffect(() => {
		if (!command) {
			return;
		}
		const timer = setTimeout(() => scrollNow(command.target), SCROLL_AFTER_MS);
		return () => clearTimeout(timer);
	}, [command]);
}
