export function joinDictation(finalised: string, live: string): string {
	return [finalised.trim(), live.trim()].filter(Boolean).join(" ");
}
