import { useState } from "react";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import type { Seg, Timeline } from "../reflect-model";
import { QUOTE_TEXT } from "../your-words";
import { type Band, InkPhrase, MarkBand, QUOTE_LINES } from "./quote-band";

type Line = {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
};
type Portion = {
	key: string;
	pair: number;
	line: Line;
	prefix: string;
	piece: string;
};
/** Wide enough that a measured run never wraps. */
const MEASURE_W = 2000;

/** Each pair's character range in your words. */
function pairRanges(segs: readonly Seg[]) {
	const out: { pair: number; a: number; b: number }[] = [];
	let at = 0;
	for (const [text, pair] of segs) {
		if (pair >= 0) {
			out.push({ a: at, b: at + text.length, pair });
		}
		at += text.length;
	}
	return out;
}

/** For each pair, the part on each laid-out line, and what to measure for its x and width. */
function portions(full: string, segs: readonly Seg[], lines: Line[]) {
	const ranges = pairRanges(segs);
	const out: Portion[] = [];
	let la = 0;
	for (const line of lines) {
		const lb = la + line.text.length;
		for (const { pair, a, b } of ranges) {
			const s = Math.max(a, la);
			const piece = full.slice(s, Math.min(b, lb)).trimEnd();
			if (piece) {
				out.push({
					key: `${pair}:${la}`,
					line,
					pair,
					piece,
					prefix: full.slice(la, s),
				});
			}
		}
		la = lb;
	}
	return out;
}

type Props = {
	segs: readonly Seg[];
	e: SharedValue<number>;
	tl: Timeline;
	/** The pairs of the tapped line, and a count per tap. */
	flash: { pairs: readonly number[]; n: number };
	flashColor: string;
};

/**
 * Your words with marker bands under the phrases the mirror borrowed (S8, pinch-to-summarize).
 * The phrases sit mid-paragraph, so:
 * 1. lay the paragraph out once on a hidden copy (`onTextLayout` gives its lines' text);
 * 2. find each phrase's line(s) from the lines' text;
 * 3. get its x and width by measuring, in one pass of hidden single-line texts, the line's text
 *    up to and through the phrase, and the phrase alone;
 * 4. draw one band per line segment under the text, growing left to right in its turn, as the
 *    phrase turns ink.
 */
export function QuoteMarks({ segs, e, tl, flash, flashColor }: Props) {
	const text = segs.map(([t]) => t).join("");
	const [lines, setLines] = useState<Line[] | null>(null);
	const [widths, setWidths] = useState<Record<string, number>>({});
	const parts = lines ? portions(text, segs, lines) : [];
	const toMeasure = [
		...new Set(parts.flatMap((p) => [p.prefix + p.piece, p.piece])),
	];
	const measured = toMeasure.every((s) => widths[s] !== undefined);
	const bands: Band[] = measured
		? parts.map((p) => ({
				h: p.line.height,
				key: p.key,
				pair: p.pair,
				w: widths[p.piece] ?? 0,
				x:
					p.line.x + (widths[p.prefix + p.piece] ?? 0) - (widths[p.piece] ?? 0),
				y: p.line.y,
			}))
		: [];
	const pairs = [...new Set(bands.map((b) => b.pair))];

	return (
		<View>
			<View
				accessibilityElementsHidden
				className="absolute inset-0 opacity-0"
				importantForAccessibility="no-hide-descendants"
				pointerEvents="none"
			>
				<AppText
					onTextLayout={(ev) => lines || setLines(ev.nativeEvent.lines)}
					style={QUOTE_TEXT}
					variant="callout"
				>
					{text}
				</AppText>
			</View>
			{measured ? null : (
				<View
					accessibilityElementsHidden
					className="absolute top-0 left-0 opacity-0"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={{ width: MEASURE_W }}
				>
					{toMeasure.map((s) => (
						<AppText
							className="self-start"
							key={s}
							numberOfLines={1}
							onTextLayout={(ev) => {
								const w = ev.nativeEvent.lines[0]?.width ?? 0;
								setWidths((m) => (m[s] === undefined ? { ...m, [s]: w } : m));
							}}
							style={QUOTE_TEXT}
							variant="callout"
						>
							{s}
						</AppText>
					))}
				</View>
			)}
			{bands.map((b) => (
				<MarkBand
					at={tl.litAt(b.pair)}
					band={b}
					e={e}
					flashColor={flashColor}
					flashN={flash.pairs.includes(b.pair) ? flash.n : 0}
					key={b.key}
				/>
			))}
			<AppText
				color="muted"
				numberOfLines={QUOTE_LINES}
				style={QUOTE_TEXT}
				variant="callout"
			>
				{text}
			</AppText>
			{pairs.map((pair) => (
				<InkPhrase
					at={tl.litAt(pair)}
					e={e}
					key={pair}
					pair={pair}
					segs={segs}
				/>
			))}
		</View>
	);
}
