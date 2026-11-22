import { View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { Presets } from "react-native-pulsar";
import type { SharedValue } from "react-native-reanimated";
import { MOOD_WORDS, PROMISE } from "../copy";
import { clamp, lerp, type Stage } from "../first-run-motion";
import { CARD, cardWidth, MoodCard } from "./mood-card";
import {
	cardLeft,
	DRAG_SMOOTH,
	MAX_THROW,
	N,
	type PEng,
} from "./promise-scene";

const TAP_SLOP = 6;
const MS = 1000;

export function MoodBelt({
	eng,
	stage,
}: {
	eng: SharedValue<PEng>;
	stage: Stage;
}) {
	const cw = cardWidth(stage);
	const flick = () => Presets.flick();
	const pan = usePanGesture({
		minDistance: 0,
		onBegin: (ev) => {
			eng.modify((e) => {
				"worklet";
				if (e.tx >= 0) {
					return e;
				}
				e.dragVel = e.v;
				e.dragging = false;
				e.lastX = ev.x;
				e.lastAt = e.now;
				e.startX = ev.x;
				return e;
			});
		},
		onFinalize: (ev) => {
			const cur = eng.get();
			if (cur.tx >= 0) {
				return;
			}
			let tapped = -1;
			if (!cur.dragging) {
				for (let i = 0; i < N; i++) {
					const left = cardLeft(cur, i, cw);
					if (ev.x >= left && ev.x < left + cw) {
						tapped = i;
					}
				}
			}
			eng.modify((e) => {
				"worklet";
				if (e.dragging) {
					e.dragging = false;
					e.v = e.rm ? 0 : clamp(e.dragVel, -MAX_THROW, MAX_THROW);
					e.vd = 0;
				} else if (tapped >= 0) {
					e.ni = tapped;
					e.tn = e.now;
				}
				return e;
			});
			if (tapped >= 0) {
				flick();
			}
		},
		onUpdate: (ev) => {
			eng.modify((e) => {
				"worklet";
				if (e.tx >= 0) {
					return e;
				}
				if (!e.dragging && Math.abs(ev.x - e.startX) > TAP_SLOP) {
					e.dragging = true;
					e.v = 0;
					e.vd = 0;
				}
				const dx = ev.x - e.lastX;
				const dts = Math.max(1, e.now - e.lastAt) / MS;
				if (e.dragging) {
					e.off -= dx;
					e.dragVel = lerp(
						e.dragVel,
						-dx / dts,
						1 - Math.exp(-dts / DRAG_SMOOTH)
					);
				}
				e.lastX = ev.x;
				e.lastAt = e.now;
				return e;
			});
		},
	});
	return (
		<GestureDetector gesture={pan}>
			<View
				accessibilityLabel={PROMISE.moods(MOOD_WORDS)}
				accessible
				className="absolute left-0"
				style={{ height: CARD.h, top: CARD.top + stage.dy, width: stage.W }}
			>
				{MOOD_WORDS.map((m, i) => (
					<MoodCard eng={eng} i={i} key={m} stage={stage} />
				))}
			</View>
		</GestureDetector>
	);
}
