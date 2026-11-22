import { type SharedValue, useSharedValue } from "react-native-reanimated";
import type { WordLayer } from "@/features/vent/words/word-layer";

export const PHASE = {
	ash: 5,
	burn: 3,
	field: 1,
	none: 4,
	rec: 2,
	sparse: 0,
} as const;
export type FieldPhase = keyof typeof PHASE;

export type FieldCmd = {
	seq: number;
	phase: number;
	settled: boolean;
	recOff: number;
	ceilMs: number;
	skip: number;
	flx: number;
	fly: number;
};

export type FieldControl = {
	cmd: SharedValue<FieldCmd>;
	level: SharedValue<number>;
	pinch: SharedValue<number>;
	layer: SharedValue<WordLayer | null>;
	wordsShown: SharedValue<number>;
	go: (
		phase: FieldPhase,
		opts?: Partial<Omit<FieldCmd, "seq" | "phase">>
	) => void;
};

const FREE_CEILING_MS = 120_000;
const REST: Omit<FieldCmd, "seq" | "phase"> = {
	ceilMs: FREE_CEILING_MS,
	flx: 0,
	fly: 0,
	recOff: 0,
	settled: false,
	skip: -1,
};

export function useFieldControl(
	first: FieldPhase,
	settled: boolean,
	level: SharedValue<number>
): FieldControl {
	const cmd = useSharedValue<FieldCmd>({
		phase: PHASE[first],
		seq: 0,
		...REST,
		settled,
	});
	const pinch = useSharedValue(0);
	const layer = useSharedValue<WordLayer | null>(null);
	const wordsShown = useSharedValue(1);
	const go: FieldControl["go"] = (phase, opts) => {
		if (phase === "burn") {
			pinch.set(0);
		}
		cmd.set({ phase: PHASE[phase], seq: cmd.get().seq + 1, ...REST, ...opts });
	};
	return { cmd, go, layer, level, pinch, wordsShown };
}
