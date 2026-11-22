import { useState } from "react";
import { LAYOUT } from "../session-look";

const L = LAYOUT;
const TOP_END = L.private.top + L.private.line;
const ABOVE = L.face.top - TOP_END;
const BELOW = L.word.top - L.face.top - L.face.size;
const BOTTOM_H = L.notSure.top + L.notSure.h - L.word.top;
const CTA_GAP = 12;
const MIN_FACE = 56;

export type FaceFit = {
	bottomTop: number;
	dy: number;
	fit: number;
};

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
