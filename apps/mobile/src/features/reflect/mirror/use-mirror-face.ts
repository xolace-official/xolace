import { useEffect, useEffectEvent, useRef } from "react";
import { PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { FACE } from "../face-poses";
import { FACE_MOTION, WRITE_IN } from "../motion";
import { useReflect } from "../reflect-data";
import type { Timeline } from "../reflect-model";

const MS_PER_S = 1000;
const GLANCE_LEAD_S = 0.1;

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

	useEffect(() => {
		const timers = arrive();
		return () => {
			for (const t of timers) {
				clearTimeout(t);
			}
		};
	}, [landN, heavy]);

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
