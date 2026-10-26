export interface DiffLine {
	kind: "same" | "added" | "removed";
	text: string;
}

/** `table(i, j)` = length of the longest common subsequence of `a[i:]` and `b[j:]`. */
function lcsTable(a: readonly string[], b: readonly string[]) {
	const width = b.length + 1;
	const cells = new Uint32Array((a.length + 1) * width);
	const at = (i: number, j: number) => cells[i * width + j] ?? 0;
	for (let i = a.length - 1; i >= 0; i -= 1) {
		for (let j = b.length - 1; j >= 0; j -= 1) {
			cells[i * width + j] =
				a[i] === b[j]
					? at(i + 1, j + 1) + 1
					: Math.max(at(i + 1, j), at(i, j + 1));
		}
	}
	return at;
}

/**
 * Line diff by longest common subsequence. Bodies are a few hundred lines at most,
 * so the O(n·m) table is fine and keeps us off a diff dependency.
 */
export function diffLines(before: string, after: string): DiffLine[] {
	const a = before.split("\n");
	const b = after.split("\n");
	const lcs = lcsTable(a, b);

	const lines: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) {
			lines.push({ kind: "same", text: a[i] ?? "" });
			i += 1;
			j += 1;
		} else if (
			j >= b.length ||
			(i < a.length && lcs(i + 1, j) >= lcs(i, j + 1))
		) {
			lines.push({ kind: "removed", text: a[i] ?? "" });
			i += 1;
		} else {
			lines.push({ kind: "added", text: b[j] ?? "" });
			j += 1;
		}
	}
	return lines;
}

export type DiffHunk =
	| { kind: "lines"; lines: DiffLine[] }
	| { kind: "skip"; count: number };

/** Keeps `context` unchanged lines around each change and folds the rest. */
export function toHunks(lines: readonly DiffLine[], context = 2): DiffHunk[] {
	const keep = lines.map((_, index) =>
		lines
			.slice(Math.max(0, index - context), index + context + 1)
			.some((line) => line.kind !== "same")
	);

	const hunks: DiffHunk[] = [];
	for (const [index, line] of lines.entries()) {
		const last = hunks.at(-1);
		if (keep[index]) {
			if (last?.kind === "lines") {
				last.lines.push(line);
			} else {
				hunks.push({ kind: "lines", lines: [line] });
			}
		} else if (last?.kind === "skip") {
			last.count += 1;
		} else {
			hunks.push({ count: 1, kind: "skip" });
		}
	}
	return hunks;
}
