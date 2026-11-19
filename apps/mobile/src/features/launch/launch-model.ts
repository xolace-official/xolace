/**
 * The launch cover's numbers and rules, in one place. The cover's first frame has to be the
 * native splash's last one (`native-splash.ts`, `expo-splash-screen`): the same art, the same box,
 * the same colour (`--color-launch-*` in global.css). `launch-model.test.ts` holds this file, the
 * splash options, global.css and the Default theme's backgrounds together.
 */
export type LaunchScheme = "light" | "dark";

/** The cover's background class per scheme: the native splash's colours, the Default theme's. */
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
	/** The logo starts breathing only if loading runs past this, so a fast launch reads as one still. */
	breatheAfterMs: 350,
	/** The cover fades out over the first screen. */
	exitMs: 420,
	/**
	 * The longest the cover stays up, whatever still holds it. A launch on a slow network takes
	 * 2–4 s (fonts, Clerk from its cache, the Convex token, the gate query); past 8 s something is
	 * stuck (offline, a hung query), the logo has breathed nearly twice, and the person needs to
	 * see the app is still working: the cover leaves and what is loading shows its own quiet
	 * state. 8 s is also the app's longest wait for an account after sign-in (`HOLD_MS`).
	 */
	maxCoverMs: 8000,
	/** If the art never reports it is on screen, hide the native splash anyway. */
	nativeHideFallbackMs: 800,
	/**
	 * After launch, a loading step waits this long before showing its spinner, so a load that
	 * resolves at once shows nothing at all.
	 */
	quietSpinnerAfterMs: 400,
	/** Reduce Motion: a plain fade. */
	reducedExitMs: 200,
	/**
	 * After the last hold lifts, wait this long before leaving: loading steps hand off to each other
	 * across a render or two, and the first screen needs a frame on screen under the cover.
	 */
	settleMs: 80,
} as const;

/** The logo on the way out: a small lift and grow while the cover fades. Never smaller. */
export const EXIT_LIFT = { scale: 1.05, translateY: -6 } as const;

/**
 * cover → exiting → gone. The cover is up from the first JS frame; it leaves once and is gone
 * for the rest of the process.
 */
export type LaunchPhase = "cover" | "exiting" | "gone";

/**
 * What can hold the cover at launch: the font pair, the root gate, the account's bootstrap and
 * Today's first screen (its route).
 */
export type HoldReason = "fonts" | "gate" | "bootstrap" | "today";

export type LaunchState = {
	phase: LaunchPhase;
	/** What still holds the cover up, one entry per hold. */
	holds: readonly HoldReason[];
	/** Bumped by a dev replay, so the cover remounts from its first frame. */
	run: number;
	/** The cover's light or dark: the phone's at launch, as the native splash is. */
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

/** Drops one hold with this reason, if there is one. */
function without(
	holds: readonly HoldReason[],
	reason: HoldReason
): readonly HoldReason[] {
	const at = holds.indexOf(reason);
	return at === -1 ? holds : [...holds.slice(0, at), ...holds.slice(at + 1)];
}

/** One step of the cover's state. Same state back when the event changes nothing. */
export function launchStep(
	state: LaunchState,
	event: LaunchEvent
): LaunchState {
	switch (event.type) {
		case "hold":
			// Only while it is up: once it is leaving, a loading step shows its own state.
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

/** The cover may start leaving: nothing holds it, or it has been up for `maxCoverMs`. */
export const coverMayLeave = (
	holds: readonly HoldReason[],
	timedOut: boolean
): boolean => holds.length === 0 || timedOut;

/** Entrances may play and native UI may take the app's scheme: the cover is leaving or gone. */
export const isRevealed = (phase: LaunchPhase): boolean => phase !== "cover";
