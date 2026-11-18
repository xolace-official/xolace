import {
	Canvas,
	Picture,
	Skia,
	type SkTypeface,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { BEATS, STORY } from "../copy";
import { BOARD } from "../first-run-motion";
import { layoutWords, seedPicture, textWidth } from "../skia-words";
import { useCanvasKick } from "../stage";
import { ageB, beatPose, NB, type SEng, seatOpen } from "./story-scene";
import {
	BIG,
	drawCount,
	drawSentence,
	HL,
	MID_X,
	WEEK_BEAT,
} from "./story-words-draw";

/**
 * Every beat's sentence in one Skia canvas (ember-glow-story): words written in turn, rising out of
 * a blur, key words lit with a flash. Only the current beat and the one leaving are drawn.
 */
export function StoryWords({
	eng,
	bold,
	heavy,
}: {
	eng: SharedValue<SEng>;
	bold: SkTypeface | null;
	heavy: SkTypeface | null;
}) {
	const sentences = bold
		? BEATS.map((bt) =>
				layoutWords(Skia.Font(bold, HL.size), bt.words, {
					gap: HL.gap * HL.size,
					left: HL.left,
					lineH: HL.lineH,
					top: HL.top,
					track: HL.track * HL.size,
				})
			)
		: null;
	const nums = heavy
		? Array.from({ length: STORY.count + 1 }, (_, n) => {
				const f = Skia.Font(heavy, BIG.size);
				const t = String(n);
				const w = textWidth(f, t, BIG.track * BIG.size);
				return layoutWords(f, [{ t }], {
					gap: 0,
					left: MID_X - w / 2,
					lineH: BIG.lineH,
					top: BIG.top,
					track: BIG.track * BIG.size,
				})[0];
			})
		: null;
	const kick = useCanvasKick();
	const picture = useDerivedValue(() => {
		const rec = Skia.PictureRecorder();
		const c = rec.beginRecording(Skia.XYWHRect(0, 0, BOARD.w, BOARD.h));
		seedPicture(c);
		if (sentences) {
			const e = eng.get();
			const so = seatOpen(e);
			for (let i = 0; i < NB; i++) {
				const bp = beatPose(e, i, so);
				if (bp.op <= 0.003) {
					continue;
				}
				const b = i === e.beat ? ageB(e) : 99_999;
				drawSentence(c, e, i, sentences[i], b, bp.op, bp.dy);
				if (i === WEEK_BEAT && nums) {
					drawCount(c, e, nums, b, bp.op, bp.dy);
				}
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
