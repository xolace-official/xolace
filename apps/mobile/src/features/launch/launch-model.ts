export type LaunchScheme = "light" | "dark";

export const COVER_CLASS: Record<LaunchScheme, string> = {
	dark: "bg-launch-dark",
	light: "bg-launch-light",
};

/**
 * The splash's `imageWidth`: the native splash draws the logo aspect-fit in a square this
 * size, centred. iOS draws it at 200 pt; Android 12+ puts it in the icon's 288 dp canvas at 76 dp,
 * centred on the window, so the cover draws it there at that size.
 */
export const LOGO_BOX = { android: 76, ios: 200 } as const;

export const logoBox = (os: string): number =>
	os === "android" ? LOGO_BOX.android : LOGO_BOX.ios;

export const LAUNCH_TIMING = {
	breatheAfterMs: 350,
	exitMs: 420,
	maxCoverMs: 8000,
	nativeHideFallbackMs: 800,
	quietSpinnerAfterMs: 400,
	reducedExitMs: 200,
	settleMs: 80,
} as const;

export const EXIT_LIFT = { scale: 1.05, translateY: -6 } as const;

export type LaunchPhase = "cover" | "exiting" | "gone";

/** Crisis resources inside the root's `(cant-reach)` group: bundled, so they open offline. */
export const CANT_REACH_HELP_PATH = "/need-help";

export type HoldReason = "fonts" | "gate" | "bootstrap" | "today";

export type LaunchState = {
	phase: LaunchPhase;
	holds: readonly HoldReason[];
	run: number;
	scheme: LaunchScheme;
};

export type LaunchEvent =
	| { type: "hold"; reason: HoldReason }
	| { type: "release"; reason: HoldReason }
	| { type: "leave" }
	| { type: "done" }
	| { type: "replay"; scheme: LaunchScheme };

export const initialLaunch = (scheme: LaunchScheme): LaunchState => ({
	holds: [],
	phase: "cover",
	run: 0,
	scheme,
});

function without(
	holds: readonly HoldReason[],
	reason: HoldReason
): readonly HoldReason[] {
	const at = holds.indexOf(reason);
	return at === -1 ? holds : [...holds.slice(0, at), ...holds.slice(at + 1)];
}

export function launchStep(
	state: LaunchState,
	event: LaunchEvent
): LaunchState {
	switch (event.type) {
		case "hold":
			return state.phase === "cover"
				? { ...state, holds: [...state.holds, event.reason] }
				: state;
		case "release": {
			const holds = without(state.holds, event.reason);
			return holds === state.holds ? state : { ...state, holds };
		}
		case "leave":
			return state.phase === "cover" ? { ...state, phase: "exiting" } : state;
		case "done":
			return state.phase === "exiting" ? { ...state, phase: "gone" } : state;
		case "replay":
			return {
				...state,
				phase: "cover",
				run: state.run + 1,
				scheme: event.scheme,
			};
		default:
			return state;
	}
}

export const coverMayLeave = (
	holds: readonly HoldReason[],
	timedOut: boolean
): boolean => holds.length === 0 || timedOut;

export const isRevealed = (phase: LaunchPhase): boolean => phase !== "cover";
