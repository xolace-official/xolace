export type GleamWord = { text: string; start: number; last: boolean };

export function gleamRows(
	rows: readonly string[],
	at: number,
	step: number
): GleamWord[][] {
	let n = 0;
	return rows.map((row) => {
		const words = row.trim().split(/\s+/).filter(Boolean);
		return words.map((text, j) => {
			const start = at + n * step;
			n += 1;
			return { last: j === words.length - 1, start, text };
		});
	});
}
