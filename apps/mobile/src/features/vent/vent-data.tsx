import { createContext, type ReactNode, use } from "react";
import type { FieldControl } from "@/features/vent/field/field-control";
import { useVentFlow } from "@/features/vent/flow/use-vent-flow";
import { useVent } from "@/features/vent/use-vent";
import type { WordRect } from "@/features/vent/words/word-layer";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/**
 * Where the vent is (handoff §1): the first time, ready, listening, the burn and its wait, the
 * reply lighting, the words burning, "Gone.". Crisis stays on `heard`.
 */
export type VentPhase =
	| "intro"
	| "idle"
	| "rec"
	| "burn"
	| "heard"
	| "ash"
	| "gone";

/**
 * Everything the vent's parts read and do. The flow (`flow/use-vent-flow.ts`) makes it from a
 * backend, and two adapters fill that: Convex and the mic in the app (`VentData`), fixtures in
 * the dev states (`dev/`). No part calls the backend itself, so a dev state is the whole vent,
 * burn and reply included, and a tap in one never reaches the server or spends a voice credit.
 */
export type Vent = {
	state: {
		phase: VentPhase;
		reduced: boolean;
		/** v2: the last 10 s before it lets go on its own. */
		soon: boolean;
		micOff: boolean;
		/** v2: today's voice replies are used, before the vent. */
		capBefore: boolean;
		/** After the burn: the replies were used, so there was no reply. */
		capAfter: boolean;
		/** The reply is production's fixed crisis line: it stays, with support under it. */
		crisis: boolean;
		/** The reply's words, and when each starts to light once the voice starts. */
		reply: { words: string[]; starts: number[] | null };
		/** The field draws; false once it has gone, so nothing records empty frames. */
		running: boolean;
		field: FieldControl;
	};
	actions: {
		understand: () => void;
		/** Starts listening, or lets it go. */
		tapMic: () => void;
		/** v2: a flick up while it listens, with its unit direction. */
		flick: (x: number, y: number) => void;
		/** Pinch-spread during the gather. */
		burst: () => void;
		close: () => void;
		openSettings: () => void;
		support: () => void;
		onBurnComplete: () => void;
		onWordsLaidOut: (
			rects: WordRect[],
			fontSize: number,
			lineH: number
		) => void;
	};
};

const VentContext = createContext<Vent | null>(null);

export function VentProvider({
	value,
	children,
}: {
	value: Vent;
	children: ReactNode;
}) {
	return <VentContext value={value}>{children}</VentContext>;
}

/** The app's adapter: the vent on Convex, the recorder and PostHog. */
export function VentData({ children }: { children: ReactNode }) {
	const reduced = useEffectiveReducedMotion();
	const { vent } = useVentFlow(useVent(), reduced);
	return <VentProvider value={vent}>{children}</VentProvider>;
}

export function useVentScreen(): Vent {
	const vent = use(VentContext);
	if (!vent) {
		throw new Error("useVentScreen needs a VentProvider above it");
	}
	return vent;
}
