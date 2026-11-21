/**
 * The Reflect mic's press, as a pure model the gesture worklet steps through.
 *
 * - `idle`: no take, or a press that hasn't held long enough to start one.
 * - `holding`: a held take; letting go keeps the words.
 * - `cancel`: slid up far enough; letting go cancels the take.
 * - `lock`: slid right far enough; letting go locks the take on.
 * - `locked`: listening hands-free; the next press stops and keeps the words.
 */
export type MicPhase = "idle" | "holding" | "cancel" | "lock" | "locked";

export type MicRelease = "tap" | "keep" | "cancel" | "lock" | "stop";

/** Translation from where the press began, in points. Up and right are `dy < 0` and `dx > 0`. */
export const MIC_DRAG = {
	cancelArm: -40,
	cancelDisarm: -28,
	lockArm: 64,
	lockDisarm: 48,
} as const;

// Declared before `dragPhase`: its worklet captures this when it is defined.
function armFromHold(dx: number, dy: number): MicPhase {
	"worklet";
	const up = dy / MIC_DRAG.cancelArm;
	const right = dx / MIC_DRAG.lockArm;
	if (up <= 1 && right <= 1) {
		return "holding";
	}
	return up >= right ? "cancel" : "lock";
}

/**
 * Lock and cancel never arm together: whichever crossed its threshold first
 * holds until it disarms, and a frame that crosses both at once goes to the
 * axis that went further past its threshold.
 */
export function dragPhase(phase: MicPhase, dx: number, dy: number): MicPhase {
	"worklet";
	if (phase === "cancel") {
		return dy > MIC_DRAG.cancelDisarm ? armFromHold(dx, dy) : "cancel";
	}
	if (phase === "lock") {
		return dx < MIC_DRAG.lockDisarm ? armFromHold(dx, dy) : "lock";
	}
	if (phase === "holding") {
		return armFromHold(dx, dy);
	}
	return phase;
}

export function releaseOf(phase: MicPhase): MicRelease {
	"worklet";
	switch (phase) {
		case "holding":
			return "keep";
		case "cancel":
			return "cancel";
		case "lock":
			return "lock";
		case "locked":
			return "stop";
		default:
			return "tap";
	}
}

/** The phase after letting go; only a lock outlives the press. */
export function afterRelease(phase: MicPhase): MicPhase {
	"worklet";
	return phase === "lock" ? "locked" : "idle";
}
