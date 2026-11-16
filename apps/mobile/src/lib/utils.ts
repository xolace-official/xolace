/** Merges class names with our tokens taught to tailwind-merge (src/lib/cn.ts). */
export { cn } from "@/lib/cn";

/** Takes a subtree out of the accessibility tree; `opacity: 0` and `pointerEvents="none"` leave
 * it reachable by VoiceOver/TalkBack. */
export const a11yHidden = (hidden: boolean) =>
	({
		accessibilityElementsHidden: hidden,
		importantForAccessibility: hidden ? "no-hide-descendants" : "auto",
	}) as const;
