/** One word of a gleam: its text, when it starts (ms), and whether it ends its row. */
export type GleamWord = { text: string; start: number; last: boolean };

/**
 * The gleam's rows as words, each with its start on the caller's clock: word
 * n starts at `at + n·step`, counting across rows. Splits on any run of
 * whitespace (a user's own line can have double spaces), so there are no
 * empty words; repeated words stay distinct by position.
 */
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
