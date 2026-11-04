/**
 * Finalised segments plus the live one. iOS 18 prefixes post-pause segments with a space; trimmed.
 */
export function joinDictation(finalised: string, live: string): string {
	return [finalised.trim(), live.trim()].filter(Boolean).join(" ");
}
