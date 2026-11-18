import { Canvas, Picture, Skia, TileMode } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { ease, type Stage, seg, TAU } from "../first-run-motion";
import { STORY_COLORS } from "../first-run-palette";
import { seedPicture } from "../skia-words";
import { useCanvasKick } from "../stage";
import { drawGlow, glowPose } from "./glow";
import { ageB, ageSeat, ageT, type SEng, seatOpen } from "./story-scene";

/** Board `.sfire`: the fire glow behind Flux, 400 × 330 at (−30, 270), breathing. */
const SFIRE = { cx: 170, cy: 435, rx: 200, ry: 165 };

/**
 * The ground and its glow (no video): two gradients in one Skia canvas. It changes colour per beat
 * over 800 ms with an 80 pt surge, swells with the vent, and gathers to the fire for the seat.
 */
export function StoryGlow({
	eng,
	stage,
	gate,
}: {
	eng: SharedValue<SEng>;
	stage: Stage;
	gate?: SharedValue<number>;
}) {
	const cols = STORY_COLORS.seatFire.map((c) => Skia.Color(c));
	const kick = useCanvasKick();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, stage.W, stage.H));
		seedPicture(c);
		// Over the promise's hand-off, clear until the swap: then the same first frame the promise drew.
		if (gate && gate.get() === 0) {
			return rec.finishRecordingAsPicture();
		}
		const e = eng.get();
		const b = ageB(e);
		const t = ageT(e);
		const so = seatOpen(e);
		const from = e.prev >= 0 ? e.prev : e.beat;
		const cross = e.rm ? 1 : ease(seg(b, 0, 800));
		const surge =
			e.rm || e.prev < 0 ? 0 : b < 180 ? b / 180 : 1 - ease(seg(b, 180, 900));
		drawGlow(
			c,
			stage,
			glowPose(t, e.rm, from, e.beat, cross, surge, so, e.vent),
			so
		);
		const sa = ageSeat(e);
		if (sa >= 0 || so > 0) {
			const br = e.rm ? 0 : Math.sin((t / 2200) * TAU);
			const o =
				(e.rm ? 1 : ease(seg(sa < 0 ? 9999 : sa, 100, 900))) *
				(0.85 + 0.15 * br) *
				so;
			const p = Skia.Paint();
			p.setAlphaf(o);
			p.setShader(
				Skia.Shader.MakeRadialGradient(
					{ x: 0, y: 0 },
					SFIRE.rx,
					cols,
					[0, 0.55, 1],
					TileMode.Clamp
				)
			);
			c.save();
			c.translate(SFIRE.cx + stage.dx, SFIRE.cy + stage.dy);
			c.scale(1 + 0.04 * br, ((1 + 0.04 * br) * SFIRE.ry) / SFIRE.rx);
			c.drawCircle(0, 0, SFIRE.rx, p);
			c.restore();
		}
		return rec.finishRecordingAsPicture();
	});
	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Picture key={kick} picture={picture} />
		</Canvas>
	);
}
