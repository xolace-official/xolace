import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class names with conflict resolution. Use this for conditional className
 * composition. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Takes a subtree out of the accessibility tree; `opacity: 0` and `pointerEvents="none"` leave
 * it reachable by VoiceOver/TalkBack. */
export const a11yHidden = (hidden: boolean) =>
	({
		accessibilityElementsHidden: hidden,
		importantForAccessibility: hidden ? "no-hide-descendants" : "auto",
	}) as const;
