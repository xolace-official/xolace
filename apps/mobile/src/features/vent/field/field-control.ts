import { type SharedValue, useSharedValue } from "react-native-reanimated";
import type { WordLayer } from "@/features/vent/words/word-layer";

/**
 * What React tells the field. React only says which phase; everything per frame lives in shared
 * values on the UI thread (handoff §17). A phase change is a command with a sequence number,
 * applied by the frame callback on its next frame (production's `pendingPhase`).
 */
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
	/** Skip the entry: the field is already assembled (Review jumps). */
	settled: boolean;
	/** Recording: ms already spoken when this command was sent. */
	recOff: number;
	/** Recording: the ceiling, when it lets go on its own (120 s, 150 s with Plus). */
	ceilMs: number;
	/** Burn: a pinch already cut the gather at this ms, or -1. */
	skip: number;
	/** Burn, v2: the flick's unit direction. */
	flx: number;
	fly: number;
};

export type FieldControl = {
	cmd: SharedValue<FieldCmd>;
	/** The recorder's metering, 0–1. */
	level: SharedValue<number>;
	/** Set by the pinch-spread gesture during the gather. */
	pinch: SharedValue<number>;
	/** The reply drawn into an image, ready to burn. */
	layer: SharedValue<WordLayer | null>;
	/** The real words' opacity: the field hides them the frame it starts to burn them. */
	wordsShown: SharedValue<number>;
	go: (
		phase: FieldPhase,
		opts?: Partial<Omit<FieldCmd, "seq" | "phase">>
	) => void;
};

/** Production's free ceiling; a recording command always sends the real one. */
const FREE_CEILING_MS = 120_000;
const REST: Omit<FieldCmd, "seq" | "phase"> = {
	ceilMs: FREE_CEILING_MS,
	flx: 0,
	fly: 0,
	recOff: 0,
	settled: false,
	skip: -1,
};

/** `level` is the recorder's metering, owned by the data hook. */
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
