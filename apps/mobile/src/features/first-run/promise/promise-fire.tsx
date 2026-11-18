import { Canvas, Picture, Skia, TileMode } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { useTokenColors } from "@/lib/use-token-color";
import { useFireInk } from "../fire-ink";
import { clamp, ease, easeIO, type Stage, seg } from "../first-run-motion";
import { drawSpark, seedPicture } from "../skia-words";
import { useCanvasKick } from "../stage";
import { drawGlow, glowPose } from "../story/glow";
import { ageX, CTA_Y, type PEng, SPARKS, underglow, X } from "./promise-scene";

/** Board `.ug`: a 690 × 420 ellipse at (−150, 640), ember, breathing low on the screen. */
const UG = { h: 420, originY: 0.4, w: 690, x: -150, y: 640 };
const COAL = 16;
const STOPS = [0, 0.3, 0.55, 0.72];
const RM_FADE_MS = 300;

/** The underglow, under the cards: the fire to come. */
export function PromiseUnderglow({
	eng,
	stage,
	day,
}: {
	eng: SharedValue<PEng>;
	stage: Stage;
	day: boolean;
}) {
	const light = day ? "day" : "dusk";
	const cols = useTokenColors([
		`first-run-underglow-${light}-1`,
		`first-run-underglow-${light}-2`,
		`first-run-underglow-${light}-3`,
	]).map((c) => Skia.Color(c));
	const kick = useCanvasKick();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, stage.W, stage.H));
		seedPicture(c);
		const u = underglow(eng.get());
		if (u.op > 0.003) {
			const cx = UG.x + UG.w / 2 + stage.dx;
			const cy = UG.y + UG.h / 2 + stage.dy;
			const oy = UG.y + UG.h * UG.originY + stage.dy;
			const p = Skia.Paint();
			p.setAlphaf(Math.min(1, u.op));
			p.setShader(
				Skia.Shader.MakeRadialGradient(
					{ x: 0, y: 0 },
					UG.w / 2,
					cols,
					[0, 0.55, 1],
					TileMode.Clamp
				)
			);
			c.save();
			// transform-origin 50% 40%
			c.translate(cx, oy + u.ty);
			c.scale(u.sc, u.sc);
			c.translate(0, cy - oy);
			c.scale(1, UG.h / UG.w);
			c.drawCircle(0, 0, UG.w / 2, p);
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

/**
 * The hand-off (ms from letting go): the coal at (195, 730) flares at 420 as the story's glow
 * opens out from it as a circle (radius 0 → 1000 over 420–980, brightness 1.35 → 1 over
 * 520–1200), and 12 sparks rise. The glow is the story's own first frame, so the swap at 1 s
 * doesn't show.
 */
export function PromiseFire({
	eng,
	stage,
}: {
	eng: SharedValue<PEng>;
	stage: Stage;
}) {
	const first = glowPose(0, false, 0, 0, 1, 0, 0, 0);
	const ink = useFireInk();
	const coal = ink.coal.map((c) => Skia.Color(c));
	const sparkInk = { dot: ink.spark, glow: ink.sparkGlow };
	const kick = useCanvasKick();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, stage.W, stage.H));
		seedPicture(c);
		const e = eng.get();
		const x = ageX(e);
		const ox = stage.W / 2;
		const oy = CTA_Y + stage.dy;
		if (x >= 0 && e.rm) {
			const lp = Skia.Paint();
			lp.setAlphaf(clamp(x / RM_FADE_MS));
			c.saveLayer(lp);
			drawGlow(c, stage, first, 0, ink.ground);
			c.restore();
		} else if (x >= X.open[0]) {
			const r = Math.max(8, 1000 * easeIO(seg(x, X.open[0], X.open[1])));
			const bright = 1 + 0.35 * (1 - seg(x, 520, 1200));
			c.save();
			c.clipPath(Skia.PathBuilder.Make().addCircle(ox, oy, r).build(), 1, true);
			drawGlow(c, stage, first, 0, ink.ground, bright);
			c.restore();
		}
		if (x >= 0 && !e.rm) {
			for (const s of SPARKS) {
				const p = seg(x, s.at, s.at + s.dur);
				if (p <= 0 || p >= 1) {
					continue;
				}
				const px = ox + s.dx * ease(p) + Math.sin(p * 6 + s.ph) * 8;
				const py = oy - s.rise * ease(p);
				drawSpark(c, px, py, s.sz, Math.sin(Math.PI * p), sparkInk);
			}
			const eo = x < 380 ? 0 : 1 - seg(x, 560, 800);
			if (eo > 0.003) {
				const sc = 1 + 2.4 * ease(seg(x, X.catch, 720));
				const p = Skia.Paint();
				p.setAlphaf(eo);
				p.setShader(
					Skia.Shader.MakeRadialGradient(
						{ x: ox, y: oy },
						(COAL / 2) * sc,
						coal,
						STOPS,
						TileMode.Clamp
					)
				);
				c.drawCircle(ox, oy, (COAL / 2) * sc, p);
			}
		}
		return rec.finishRecordingAsPicture();
	});
	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Picture key={kick} picture={picture} />
		</Canvas>
	);
}
