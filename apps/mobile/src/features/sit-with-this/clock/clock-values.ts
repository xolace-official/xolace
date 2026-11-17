import { Skia, type SkPath } from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";
import { ARC, type Arcs, arcsAt } from "./breath";
import { type ClockCfg, IDLE_CFG } from "./clock-config";
import { G } from "./phases";

/** What the clock remembers about the beat it's playing. */
export type Memo = {
	serial: number;
	playRun: number;
	phase: number;
	pulse: number;
	ended: boolean;
	link: boolean;
	done: boolean;
	capStart: number;
};

/**
 * The clock's values: what it's told (`cfg`), its time, and everything it
 * writes for the views to read on the UI thread (the breath, the light, the
 * label and caption, the thread, the arcs' geometry and paths).
 */
export function useClockValues(W: number, H: number) {
	const cfg = useSharedValue<ClockCfg>(IDLE_CFG);
	const vt = useSharedValue(0);
	/** The beat (serial) `vt` belongs to: a view of a newer beat reads 0 until the clock catches up. */
	const at = useSharedValue(-1);
	const playT = useSharedValue(0);
	const closeT = useSharedValue(0);
	const p = useSharedValue(0);
	const g = useSharedValue<number>(G.rest);
	const lp = useSharedValue(0);
	const fb = useSharedValue(0);
	const frac = useSharedValue(0);
	const leave = useSharedValue(0);
	const lab = useSharedValue(-1);
	const labE = useSharedValue(0);
	const capIdx = useSharedValue(0);
	const capE = useSharedValue(0);
	const drawn = useSharedValue({ gap: ARC.GAP as number, H, p: -1, W, w: 0 });
	const geo = useSharedValue<Arcs>(arcsAt(W, H, 0, 0));
	const topPath = useSharedValue<SkPath>(Skia.PathBuilder.Make().build());
	const botPath = useSharedValue<SkPath>(Skia.PathBuilder.Make().build());
	const seen = useSharedValue<Memo>({
		capStart: 0,
		done: false,
		ended: false,
		link: false,
		phase: -1,
		playRun: -2,
		pulse: -1,
		serial: -2,
	});
	return {
		at,
		botPath,
		capE,
		capIdx,
		cfg,
		closeT,
		drawn,
		fb,
		frac,
		g,
		geo,
		lab,
		labE,
		leave,
		lp,
		p,
		playT,
		seen,
		topPath,
		vt,
	};
}
