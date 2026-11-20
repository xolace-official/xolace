import { T2 } from "../session-look";

export function lastWordAt(text: string) {
	const W = T2.write;
	let line = 0;
	let col = 0;
	let last = 0;
	for (const w of text.split(" ")) {
		if (col && col + 1 + w.length > W.cpl) {
			line++;
			col = 0;
		}
		const x = col;
		col += (col ? 1 : 0) + w.length;
		last = Math.max(
			last,
			W.at + W.lead + line * W.line + (x / W.cpl) * W.sweep
		);
	}
	return last;
}

export function captionAt(lines: number, lastFrac: number, boardLast: number) {
	"worklet";
	const W = T2.write;
	const measured =
		W.at + W.lead + Math.max(0, lines - 1) * W.line + lastFrac * W.sweep;
	return Math.max(boardLast, measured) + T2.caption.after;
}
