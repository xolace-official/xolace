import { useEffect } from "react";
import {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useFrameCallback,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { ENSO } from "../motion";

export type EnsoMode = "paint" | "offline" | "closed";

const DEG = Math.PI / 180;
const MS = 1000;
const FRAME_MS = 16;
const MAX_STEP_MS = 50;
/** Board `.blot`: the landing blot grows from 20% of its radius. */
const BLOT_FROM = 0.2;
const CLOSE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const BLEED_EASE = Easing.out(Easing.cubic);
/** Board `.woff`: offline, the brush barely starts (6% over 1 s) and waits. */
const OFFLINE = { ms: 1000, reach: 0.06 } as const;

type Options = {
	mode: EnsoMode;
	landed: boolean;
	running: boolean;
	reduced: boolean;
	low: boolean;
	face: FaceHandle | null;
	follow: boolean;
	bleedOnce?: { delayMs: number; ms: number };
	/** The sweep's length, and the length with the tail that closes it. */
	length: number;
	full: number;
};

const bleedIn = (delayMs: number, ms: number) =>
	withDelay(
		delayMs,
		withTiming(1, { duration: ms, easing: BLEED_EASE, ...PLAY_AS_CHOSEN }),
		ReduceMotion.Never
	);

/**
 * The ensō's ink, on the board's pace: the head runs to .85·(1 − e^(−t/2 s)) of the sweep,
 * advanced from frame deltas so a pause resumes in place, and closes in .42 s when the answer
 * comes, then bleeds. Reduce Motion draws it still: open at .85 while it waits, then closed.
 */
export function useEnsoInk({
	mode,
	landed,
	running,
	reduced,
	low,
	face,
	follow,
	bleedOnce,
	length,
	full,
}: Options) {
	const closed = mode === "closed";
	const head = useSharedValue(closed ? full : 0);
	const bleed = useSharedValue(0);
	const blot = useSharedValue(closed ? 1 : BLOT_FROM);
	const dry = useSharedValue(0);
	const elapsed = useSharedValue(0);

	const painting = mode === "paint" && !landed;
	const frame = useFrameCallback((f) => {
		const dt = Math.min(f.timeSincePreviousFrame ?? FRAME_MS, MAX_STEP_MS) / MS;
		elapsed.set(elapsed.get() + dt);
		const p = ENSO.cap * (1 - Math.exp(-elapsed.get() / ENSO.tau));
		head.set(p * length);
		if (face && follow) {
			const a = (ENSO.startDeg + p * ENSO.sweepDeg) * DEG;
			face.lookNow(Math.cos(a), Math.sin(a));
		}
	}, false);
	const { setActive } = frame;
	useEffect(() => {
		setActive(painting && running && !reduced);
		return () => setActive(false);
	}, [painting, running, reduced, setActive]);

	// Reduce Motion: no brush, the circle as it would stand, open.
	useEffect(() => {
		if (painting && reduced) {
			head.set(ENSO.cap * length);
		}
	}, [painting, reduced, head, length]);

	useEffect(() => {
		if (closed) {
			return;
		}
		if (reduced) {
			blot.set(1);
			dry.set(ENSO.dryOpacity);
			return;
		}
		blot.set(
			withTiming(1, {
				duration: ENSO.blotMs,
				easing: CLOSE_EASE,
				...PLAY_AS_CHOSEN,
			})
		);
		dry.set(
			withDelay(
				ENSO.dryDelayMs,
				withTiming(ENSO.dryOpacity, {
					duration: ENSO.dryMs,
					...PLAY_AS_CHOSEN,
				}),
				ReduceMotion.Never
			)
		);
	}, [closed, reduced, blot, dry]);

	useEffect(() => {
		if (mode !== "offline" || landed) {
			return;
		}
		const reach = OFFLINE.reach * length;
		head.set(
			reduced
				? reach
				: withTiming(reach, {
						duration: OFFLINE.ms,
						easing: Easing.out(Easing.quad),
						...PLAY_AS_CHOSEN,
					})
		);
	}, [mode, landed, reduced, head, length]);

	useEffect(() => {
		if (!landed || closed) {
			return;
		}
		cancelAnimation(head);
		if (face && follow) {
			face.look(0, 0);
		}
		if (reduced) {
			head.set(full);
			bleed.set(low ? 0 : 1);
			return;
		}
		head.set(
			withTiming(full, {
				duration: ENSO.closeMs,
				easing: CLOSE_EASE,
				...PLAY_AS_CHOSEN,
			})
		);
		if (!low) {
			bleed.set(bleedIn(ENSO.bleedDelayMs, ENSO.bleedMs));
		}
	}, [landed, closed, reduced, head, bleed, full, low, face, follow]);

	const bleedDelay = bleedOnce?.delayMs ?? -1;
	const bleedMs = bleedOnce?.ms ?? 0;
	useEffect(() => {
		if (bleedDelay < 0 || low) {
			return;
		}
		bleed.set(reduced ? 1 : bleedIn(bleedDelay, bleedMs));
	}, [bleedDelay, bleedMs, low, reduced, bleed]);

	return { bleed, blot, dry, head };
}
