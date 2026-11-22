import { createContext, type ReactNode, use } from "react";
import type { FieldControl } from "@/features/vent/field/field-control";
import { useVentFlow } from "@/features/vent/flow/use-vent-flow";
import { useVent } from "@/features/vent/use-vent";
import type { WordRect } from "@/features/vent/words/word-layer";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export type VentPhase =
	| "intro"
	| "idle"
	| "rec"
	| "burn"
	| "heard"
	| "ash"
	| "gone";

export type Vent = {
	state: {
		phase: VentPhase;
		reduced: boolean;
		soon: boolean;
		micOff: boolean;
		capBefore: boolean;
		capAfter: boolean;
		crisis: boolean;
		reply: { words: string[]; starts: number[] | null };
		running: boolean;
		field: FieldControl;
	};
	actions: {
		understand: () => void;
		tapMic: () => void;
		flick: (x: number, y: number) => void;
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
