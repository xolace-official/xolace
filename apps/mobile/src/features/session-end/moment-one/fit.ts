import { useState } from "react";
import { LAYOUT } from "../session-look";

const L = LAYOUT;
/** Board: the private line ends at 233; the face box is 49 below it, the word 34 below the face. */
const TOP_END = L.private.top + L.private.line;
const ABOVE = L.face.top - TOP_END;
const BELOW = L.word.top - L.face.top - L.face.size;
/** The lower block (word … Not sure), 492 → 684. */
const BOTTOM_H = L.notSure.top + L.notSure.h - L.word.top;
/** Never closer than this to the CTA. */
const CTA_GAP = 12;
const MIN_FACE = 56;

export type FaceFit = {
	/** Where the lower block starts. */
	bottomTop: number;
	/** The face's centre moves by `dy` from the board's (370) and scales by `fit`. */
	dy: number;
	fit: number;
};

/**
 * Moment 1 is laid out at the board's positions. Under large Dynamic Type the heading and the lower
 * block grow: the lower block moves down only as far as the CTA allows, and the face shrinks to fit
 * between them (handoff §7: the face gives way before anything overlaps the CTA). At the default size
 * this returns the board's layout exactly.
 */
export function useFaceFit(y: (v: number) => number, screenH: number) {
	const [topEnd, setTopEnd] = useState(y(TOP_END));
	const [bottomH, setBottomH] = useState<number>(BOTTOM_H);
	const ctaTop = screenH - L.cta.bottom - L.cta.height;
	const grown = Math.max(0, topEnd - y(TOP_END));
	const bottomTop = Math.min(y(L.word.top) + grown, ctaTop - CTA_GAP - bottomH);
	const avail = bottomTop - topEnd - ABOVE - BELOW;
	const size = Math.max(MIN_FACE, Math.min(L.face.size, avail));
	const cy = topEnd + ABOVE + (avail - size) / 2 + size / 2;
	const fit: FaceFit = {
		bottomTop,
		dy: cy - y(L.face.top + L.face.size / 2),
		fit: size / L.face.size,
	};
	const round = (v: number) => Math.round(v * 2) / 2;
	return {
		fit,
		onBottom: (v: number) => setBottomH(round(v)),
		onTop: (v: number) => setTopEnd(round(v)),
	};
}
