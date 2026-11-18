import {
	Canvas,
	Picture,
	type SkCanvas,
	Skia,
	type SkTypeface,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { BEATS, STORY } from "../copy";
import { BOARD, clamp, ease, mixRGB, seg } from "../first-run-motion";
import { BEAT_COLORS, css, STORY_COLORS } from "../first-run-palette";
import {
	drawRun,
	layoutWords,
	type Run,
	seedPicture,
	textWidth,
} from "../skia-words";
import { useCanvasKick } from "../stage";
import { ageB, beatPose, NB, type SEng, seatOpen, W, WE } from "./story-scene";

/** Board `.hl`: 32 left, top 120, 34/41, display 720, −.028em, words .22em apart. */
export const HL = {
	gap: 0.22,
	left: 32,
	lineH: 41,
	size: 34,
	top: 120,
	track: -0.028,
};
/** Board `.big`: top 318, 104/110, display 780, −.05em, #F7D58C; it pops about 50% 60%. */
export const BIG = {
	lineH: 110,
	originY: 0.6,
	size: 104,
	top: 318,
	track: -0.05,
};
const BASE = STORY_COLORS.ink;
const LIT = BEATS.map((b) => BEAT_COLORS[b.id].lit);
const HOT = BEATS.map((b) => BEAT_COLORS[b.id].hot);
export const MID_X = BOARD.w / 2;
const COUNT_FROM = 450;
const COUNT_STEP = 62;
const XO_BEAT = 4;
const VEIL_GROUP = 2;
export const WEEK_BEAT = 3;

export function drawSentence(
	c: SkCanvas,
	e: SEng,
	i: number,
	runs: Run[],
	b: number,
	alpha: number,
	lift: number
) {
	"worklet";
	const words = BEATS[i].words;
	const we = WE[i];
	for (let j = 0; j < runs.length; j++) {
		const k = words[j].k;
		if (e.rm) {
			drawRun(
				c,
				runs[j],
				{
					blur: 0,
					color: k >= 0 ? css(LIT[i], 1) : css(BASE, 0.94),
					dy: lift,
					glow: "",
					glowR: 0,
					op: clamp(b / 200),
				},
				alpha
			);
			continue;
		}
		const p = ease(seg(b, W.at + j * W.step, W.at + j * W.step + W.dur));
		if (p <= 0) {
			continue;
		}
		let op = p;
		let blur = 3 * (1 - p);
		let color = css(BASE, 0.94);
		let glowR = 0;
		let glow = "";
		if (k >= 0) {
			const la = we + W.light + k * W.lightStep;
			const lp = seg(b, la, la + W.lightDur);
			const fl =
				b >= la ? Math.exp(-Math.max(0, b - la - W.lightDur) / 260) * lp : 0;
			color = css(mixRGB(BASE, LIT[i], lp), 1);
			glowR = 16 * fl;
			glow = css(HOT[i], 0.9 * fl);
			// "You don't.": lit, then veiled. The asymmetry, said in type.
			if (i === XO_BEAT && k === VEIL_GROUP) {
				const vp = ease(seg(b, la + 600, la + 1200));
				blur += 2.4 * vp;
				op *= 1 - 0.42 * vp;
			}
		}
		drawRun(
			c,
			runs[j],
			{ blur, color, dy: 8 * (1 - p) + lift, glow, glowR, op },
			alpha
		);
	}
}

/** The week's count: the lit embers, settling with a 6% pop and a glow. */
export function drawCount(
	c: SkCanvas,
	e: SEng,
	nums: Run[],
	b: number,
	alpha: number,
	lift: number
) {
	"worklet";
	const n = STORY.count;
	const done = COUNT_FROM + n * COUNT_STEP;
	const lit = e.rm
		? n
		: b < COUNT_FROM
			? 0
			: Math.min(n, Math.floor((b - COUNT_FROM) / COUNT_STEP) + 1);
	const pop = e.rm ? 0 : b >= done ? Math.exp(-Math.max(0, b - done) / 220) : 0;
	const op = e.rm ? 1 : ease(seg(b, 380, 700));
	const r = nums[lit];
	const oy = BIG.top + BIG.lineH * BIG.originY + lift;
	c.save();
	c.translate(MID_X, oy);
	c.scale(1 + 0.06 * pop, 1 + 0.06 * pop);
	c.translate(-MID_X, -oy);
	drawRun(
		c,
		r,
		{
			blur: 0,
			color: css(STORY_COLORS.count),
			dy: lift,
			glow: css(STORY_COLORS.countGlow, 0.7 * pop),
			glowR: 30 * pop,
			op,
		},
		alpha
	);
	c.restore();
}
