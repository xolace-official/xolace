import type { SharedValue } from "react-native-reanimated";

/** Production's states: `processing` is the burn, while the server works. */
export type VentStage = "idle" | "recording" | "processing" | "heard" | "gone";

/** What the server said back, tags stripped. Crisis is production's fixed line. */
export type VentReply = { words: string; crisis: boolean };

/**
 * What the vent's flow reads from the backend and the recorder, and asks of them. Two adapters
 * fill it: `use-vent.ts` (Convex, the mic, PostHog) and the fixtures in `dev/`.
 */
export type VentBackend = {
	state: {
		stage: VentStage;
		introSeen: boolean;
		/**
		 * v2: today's voice replies are already used, known before the vent (§4). No query
		 * serves it yet, so the app passes false.
		 */
		capBefore: boolean;
		/** It lets go on its own after this long: 120 s, 150 s with Plus. */
		ceilingMs: number;
		/** The recorder's level, 0 = silence, 1 = loud, on the UI thread. */
		level: SharedValue<number>;
		/** The microphone is off for Xolace: a tap explains it and offers Settings. */
		micOff: boolean;
		/** Set once `heard`. */
		reply: VentReply | null;
		/** Set once `gone`: the daily cap, not a failure, is why there's no reply. */
		capReached: boolean;
	};
	actions: {
		understand: () => void;
		/** Starts recording: "off" when the mic isn't allowed, "failed" on anything else. */
		start: () => Promise<"started" | "off" | "failed">;
		/** How long the take is so far, in ms. */
		recordedMs: () => number;
		/** Lets it go: the burn starts, and the take goes to the server. */
		stop: (atCeiling: boolean) => void;
		/** The burn and its silence have played. */
		burnt: () => void;
		/** Plays the reply's voice; resolves with its length once it starts, or null. */
		speak: () => Promise<number | null>;
		/** The reply has been said and has burned: on to "Gone.". */
		finish: () => void;
		/**
		 * v2: closed or left mid-recording. Nothing is sent and the take is deleted. "unmounted":
		 * the screen is already gone (closed while the mic was starting), so it doesn't navigate.
		 */
		drop: (reason: "close" | "background" | "unmounted") => void;
		/** The X, outside a recording. */
		close: () => void;
		/** "Gone." has faded: the screen closes itself. */
		leave: () => void;
		openSettings: () => void;
		/** Crisis: the support resources. */
		support: () => void;
	};
};
