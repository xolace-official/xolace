import {
	Canvas,
	Picture,
	type SkCanvas,
	Skia,
	TileMode,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { STORY } from "../copy";
import {
	BOARD,
	clamp,
	ease,
	easeIO,
	lerp,
	mod,
	seg,
	TAU,
} from "../first-run-motion";
import { css, FIRE_COLORS, STORY_COLORS } from "../first-run-palette";
import { seedPicture } from "../skia-words";
import { useCanvasKick } from "../stage";
import { cover, embers, ripples, seat, vent } from "./story-points-draw";
import {
	AUTH,
	ageAuth,
	ageOf,
	ageSeat,
	ageT,
	beatPose,
	bIf,
	FIRE0,
	FLD,
	PROV,
	SEAT_PT,
	type SEng,
	seatOpen,
	VENT_O,
} from "./story-scene";

/** Every spark, ember, ripple and coal of the story and the seat: points in one Skia canvas. */
export function StoryPoints({ eng }: { eng: SharedValue<SEng> }) {
	const kick = useCanvasKick();
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
					cover(c, e, a);
				}
				if (e.beat === 1) {
					ripples(c, e, a);
				}
				if (e.beat === 2) {
					vent(c, e, a);
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
			embers(c, e, b.op);
			c.restore();
		}
		seat(c, e, so);
		return rec.finishRecordingAsPicture();
	});
	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Picture key={kick} picture={picture} />
		</Canvas>
	);
}
