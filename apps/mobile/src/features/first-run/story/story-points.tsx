import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { useFireInk } from "../fire-ink";
import { BOARD } from "../first-run-motion";
import { seedPicture } from "../skia-words";
import { useCanvasKick } from "../stage";
import { cover, embers, ripples, seat, vent } from "./story-points-draw";
import { beatPose, type SEng, seatOpen } from "./story-scene";

export function StoryPoints({ eng }: { eng: SharedValue<SEng> }) {
	const kick = useCanvasKick();
	const ink = useFireInk();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, BOARD.w, BOARD.h));
		seedPicture(c);
		const e = eng.get();
		const so = seatOpen(e);
		if (!e.rm) {
			const b = beatPose(e, e.beat, so);
			const a = b.op;
			if (a > 0.003) {
				c.save();
				c.translate(0, b.dy);
				if (e.beat === 0) {
					cover(c, e, a, ink);
				}
				if (e.beat === 1) {
					ripples(c, e, a, ink);
				}
				if (e.beat === 2) {
					vent(c, e, a, ink);
				}
				c.restore();
			}
		}
		for (const i of [e.beat, e.prev]) {
			if (i !== 3) {
				continue;
			}
			const b = beatPose(e, 3, so);
			if (b.op <= 0.003) {
				continue;
			}
			c.save();
			c.translate(0, b.dy);
			embers(c, e, b.op, ink);
			c.restore();
		}
		seat(c, e, so, ink);
		return rec.finishRecordingAsPicture();
	});
	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Picture key={kick} picture={picture} />
		</Canvas>
	);
}
