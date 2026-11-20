export { cn } from "@/lib/cn";

export const a11yHidden = (hidden: boolean) =>
	({
		accessibilityElementsHidden: hidden,
		importantForAccessibility: hidden ? "no-hide-descendants" : "auto",
	}) as const;
