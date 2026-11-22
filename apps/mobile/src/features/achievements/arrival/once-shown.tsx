import { createContext, Fragment, type ReactNode, use } from "react";

/**
 * How many times the arrival has been shown: 0 while it waits hidden. A Skia
 * canvas that mounts hidden (the host stages the arrival at opacity 0) never
 * draws, so the confetti and the embers mount once it's on screen, and again
 * on each open.
 */
export const ShownContext = createContext(0);

export function OnceShown({ children }: { children: ReactNode }) {
	const shown = use(ShownContext);
	return shown > 0 ? <Fragment key={shown}>{children}</Fragment> : null;
}
