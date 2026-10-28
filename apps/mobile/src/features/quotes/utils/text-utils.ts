export function removeEmDash(text: string): string {
	return text
		.replace(/\s*—\s*/g, ", ")
		.replace(/ {2}/g, " ")
		.trim();
}
