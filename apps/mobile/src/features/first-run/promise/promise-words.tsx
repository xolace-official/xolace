import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import { View } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { PROMISE } from "../copy";
import {
	clamp,
	ease,
	mixRGB,
	type Stage,
	seg,
	smooth,
} from "../first-run-motion";
import { css, PROMISE_COLORS } from "../first-run-palette";
import { drawRun, type FirstRunFaces, seedPicture } from "../skia-words";
import { useCanvasKick } from "../stage";
import { ageT, leaveOf, OPEN, type PEng } from "./promise-scene";
import { BLOCK, HEIGHT, layout, PAD } from "./promise-words-layout";

const RM_FADE_MS = 200;

export function PromiseWords({
	eng,
	faces,
	stage,
	day,
}: {
	eng: SharedValue<PEng>;
	faces: FirstRunFaces;
	stage: Stage;
	day: boolean;
}) {
	const L = layout(faces);
	const pick = day ? "day" : "dusk";
	const ink = PROMISE_COLORS.ink[pick];
	const gleam = PROMISE_COLORS.gleam[pick];
	const gleamGlow = PROMISE_COLORS.gleamGlow[pick];
	const ink2 = css(PROMISE_COLORS.ink2[pick]);
	const ember = css(PROMISE_COLORS.ember[pick]);
	const gleamMix = day ? 0.85 : 1;
	const glowA = day ? 0.35 : 0.6;
	const kick = useCanvasKick();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, stage.W, HEIGHT));
		seedPicture(c);
		if (L) {
			const e = eng.get();
			const t = ageT(e);
			const leave = leaveOf(e);
			const alpha = 1 - leave;
			const lift = e.rm ? 0 : -10 * leave;
			for (let i = 0; i < L.title.length; i++) {
				if (e.rm) {
					drawRun(
						c,
						L.title[i],
						{
							blur: 0,
							color: css(ink),
							dy: lift,
							glow: "",
							glowR: 0,
							op: clamp(t / RM_FADE_MS),
						},
						alpha
					);
					continue;
				}
				const p = (t - OPEN.word0 - i * OPEN.wordStep) / OPEN.wordFor;
				if (p <= 0) {
					continue;
				}
				const gl = Math.exp(-(((p - 0.42) / 0.2) ** 2));
				drawRun(
					c,
					L.title[i],
					{
						blur: 5 * (1 - ease(p / 0.8)),
						color: css(mixRGB(ink, gleam, gl * gleamMix)),
						dy: 7 * (1 - ease(p)) + lift,
						glow: css(gleamGlow, glowA * gl),
						glowR: 8 * gl,
						op: smooth(0, 0.6, p),
					},
					alpha
				);
			}
			for (let i = 0; i < L.lines.length; i++) {
				const p = e.rm ? 1 : seg(t, OPEN.line[i], OPEN.line[i] + OPEN.lineFor);
				if (p <= 0) {
					continue;
				}
				const op = e.rm ? clamp(t / RM_FADE_MS) : smooth(0, 0.7, p);
				const blur = e.rm ? 0 : 3 * (1 - ease(p / 0.8));
				const dy = (e.rm ? 0 : 7 * (1 - ease(p))) + lift;
				const runs = L.lines[i];
				for (let k = 0; k < runs.length; k++) {
					drawRun(
						c,
						runs[k],
						{ blur, color: k === 1 ? ember : ink2, dy, glow: "", glowR: 0, op },
						alpha
					);
				}
			}
		}
		return rec.finishRecordingAsPicture();
	});
	return (
		<View
			accessibilityLabel={`${PROMISE.title} ${PROMISE.body}`}
			accessibilityRole="header"
			accessible
			className="absolute left-0"
			pointerEvents="none"
			style={{
				height: HEIGHT,
				top: BLOCK.top + stage.dy - PAD,
				width: stage.W,
			}}
		>
			<Canvas style={{ height: HEIGHT, width: stage.W }}>
				<Picture key={kick} picture={picture} />
			</Canvas>
		</View>
	);
}
