import type { FontRole } from "@/design/font-pairs";

export type RollingWeight = "regular" | "semibold" | "bold" | "heavy";

export type RollingNumberProps = {
	value: number;
	size: number;
	/** A colour string (`useTokenColor`): native text takes no class. */
	color: string;
	weight?: RollingWeight;
	/** Set the digits in the theme's heading face instead of its body face. */
	display?: boolean;
	/** Roll in 0.42 s, ease-out (Today v2's chip and counts) instead of the spring. */
	quick?: boolean;
};

const WEIGHT_ROLE: Record<RollingWeight, FontRole> = {
	bold: "bold",
	// The pairs stop at bold.
	heavy: "bold",
	regular: "normal",
	semibold: "semibold",
};

/** The theme's face the digits are set in. */
export const rollingFaceRole = (
	weight: RollingWeight,
	display: boolean
): FontRole => (display ? "display" : WEIGHT_ROLE[weight]);

/** How a change rolls: none when motion is reduced (the digits swap). */
export type Roll =
	| { kind: "none" }
	| { kind: "ease-out"; durationS: number }
	| { kind: "spring"; durationS: number; bounce: number };

const QUICK_ROLL_S = 0.42;
const SPRING_ROLL = { bounce: 0.3, durationS: 0.5 } as const;

export function rollFor(quick: boolean, reduced: boolean): Roll {
	if (reduced) {
		return { kind: "none" };
	}
	return quick
		? { durationS: QUICK_ROLL_S, kind: "ease-out" }
		: { ...SPRING_ROLL, kind: "spring" };
}
