import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class names with conflict resolution. Use this for conditional className composition. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Take a subtree out of the accessibility tree.
 *
 * `opacity: 0` and `pointerEvents="none"` hide a view from the eye and the
 * finger, and from neither VoiceOver nor TalkBack — a faded-out control is
 * still reachable by swipe. Anything animated to invisible needs this too.
 */
export const a11yHidden = (hidden: boolean) =>
  ({
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? "no-hide-descendants" : "auto",
  }) as const;