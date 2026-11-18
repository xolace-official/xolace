import { useEffect, useEffectEvent, useRef } from "react";
import { PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { FACE } from "../face-poses";
import { FACE_MOTION, WRITE_IN } from "../motion";
import { useReflect } from "../reflect-data";
import type { Timeline } from "../reflect-model";

const MS_PER_S = 1000;
/** The glance starts .1 s before the first phrase lights. */
const GLANCE_LEAD_S = 0.1;

/**
 * The mirror's face (30 pt by THE MIRROR): it arrives still thinking, then nods into `nod` at
 * 450 ms (heavy: `concern` at 1 s). While your phrases light it glances up at your words, from
 * the first lighting to .7 s after the last. Not quite has it look down at the chosen line;
 * while a refinement is with the server it thinks, and the new landing nods again.
 */
export function useMirrorFace(tl: Timeline, running: boolean) {
	const { state } = useReflect();
	const { heavy, landN, nq, pickMode, sayMore, rewriting } = state;
	const face = useFace(heavy ? FACE.heavyArrive : PRESETS.thinking, running);
	const rest = useRef(heavy ? FACE.concern : PRESETS.nod);
	const glanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const arrive = useEffectEvent(() => {
		rest.current = heavy ? FACE.concern : PRESETS.nod;
		face.hold(heavy ? FACE.heavyArrive : PRESETS.thinking);
		const timers = [
			setTimeout(
				() => {
					face.to(rest.current);
					face.nod();
				},
				heavy ? FACE_MOTION.heavyNodMs : FACE_MOTION.mirrorNodMs
			),
		];
		if (!heavy && tl.lights) {
			const firstLit = tl.writeEnd + WRITE_IN.lightAfter - GLANCE_LEAD_S;
			const after =
				tl.lastLit + WRITE_IN.lightIn + FACE_MOTION.afterLitMs / MS_PER_S;
			timers.push(
				setTimeout(() => face.to(FACE.glance), firstLit * MS_PER_S),
				setTimeout(() => face.to(rest.current), after * MS_PER_S)
			);
		}
		return timers;
	});

	// Each landing replays the arrival.
	useEffect(() => {
		const timers = arrive();
		return () => {
			for (const t of timers) {
				clearTimeout(t);
			}
		};
	}, [landN, heavy]);

	// Not quite or Say more: look at the line; picking: look down the lines; refining: think.
	useEffect(() => {
		if (rewriting) {
			face.to(PRESETS.thinking);
		} else if (nq || sayMore) {
			face.to(FACE.notQuite);
		} else if (pickMode) {
			face.to(FACE.pick);
		} else {
			face.to(rest.current);
		}
	}, [nq, sayMore, pickMode, rewriting, face]);

	useEffect(() => () => clearTimeout(glanceTimer.current), []);

	/** Tapping a borrowed line: it glances up at where you said it, for 1.1 s. */
	const glance = () => {
		clearTimeout(glanceTimer.current);
		face.to(FACE.glance);
		glanceTimer.current = setTimeout(
			() => face.to(rest.current),
			FACE_MOTION.glanceMs
		);
	};

	return { face, glance };
}
