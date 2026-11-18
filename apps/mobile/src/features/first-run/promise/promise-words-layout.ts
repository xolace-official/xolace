import { Skia } from "@shopify/react-native-skia";
import { PROMISE } from "../copy";
import {
	type FirstRunFaces,
	layoutWords,
	type Run,
	textWidth,
} from "../skia-words";

/** Board `.pr`: 28 pt in, top 478; the title 32/37 −.03em, words .24em apart; the body 14 below, 16/24. */
export const BLOCK = {
	bodyLH: 24,
	bodySize: 16,
	bodyTop: 74 + 14,
	gap: 0.24,
	left: 28,
	titleLH: 37,
	titleSize: 32,
	top: 478,
	track: -0.03,
};
/** Room round the words for their blur and glow. */
export const PAD = 24;
export const HEIGHT = BLOCK.bodyTop + 3 * BLOCK.bodyLH + PAD * 2;

type Layout = { title: Run[]; lines: Run[][] };

export function layout(faces: FirstRunFaces): Layout | null {
	const { heavy, body: regular, bodySemi } = faces;
	if (!(heavy && regular && bodySemi)) {
		return null;
	}
	const title = Skia.Font(heavy, BLOCK.titleSize);
	const words = PROMISE.words.map((t, i) => ({
		br: i === PROMISE.breakAfter,
		t,
	}));
	const body = Skia.Font(regular, BLOCK.bodySize);
	const em = Skia.Font(bodySemi, BLOCK.bodySize);
	const space = textWidth(body, " ");
	const lines = PROMISE.lines.map(([plain, lit], i) => {
		const top = PAD + BLOCK.bodyTop + i * BLOCK.bodyLH;
		const line = { gap: space, lineH: BLOCK.bodyLH, top, track: 0 };
		const a = layoutWords(body, [{ t: plain.trimEnd() }], {
			...line,
			left: BLOCK.left,
		});
		if (!lit) {
			return a;
		}
		const b = layoutWords(em, [{ t: lit }], {
			...line,
			gap: 0,
			left: BLOCK.left + a[0].w + space,
		});
		return [...a, ...b];
	});
	return {
		lines,
		title: layoutWords(title, words, {
			gap: BLOCK.gap * BLOCK.titleSize,
			left: BLOCK.left,
			lineH: BLOCK.titleLH,
			top: PAD,
			track: BLOCK.track * BLOCK.titleSize,
		}),
	};
}

/** The words' tap target (board `.pr`): a tap while they arrive brings everything in at once. */
export const WORDS_BOX = {
	height: BLOCK.bodyTop + 3 * BLOCK.bodyLH,
	left: BLOCK.left,
	top: BLOCK.top,
};
