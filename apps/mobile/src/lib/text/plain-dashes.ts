/** Reads an em dash as a comma: the words Xolace writes don't lean on it (#309). */
export function removeEmDash(text: string): string {
	return text
		.replace(/\s*—\s*/g, ", ")
		.replace(/ {2}/g, " ")
		.trim();
}
