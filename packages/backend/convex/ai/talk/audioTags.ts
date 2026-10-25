/**
 * The audio tags our endpoint lets through to ElevenLabs (#603, decided in
 * #583). eleven_v4_turbo performs bracketed tags; we emit only these five,
 * and any other bracketed text the model writes is stripped, never spoken.
 */
export const AUDIO_TAGS = [
	"laughs",
	"whispers",
	"sighs",
	"slow",
	"excited",
] as const;

const ALLOWED = new Set<string>(AUDIO_TAGS);
// Room for a stage direction ("[takes a slow breath and pauses]") to be
// judged whole; past this an open "[" is just text.
const MAX_HELD = 64;

/**
 * Filters a reply as it streams: text inside "[...]" is held until the "]",
 * so a tag split across deltas is judged whole. `flush` returns whatever is
 * still held (an unclosed "[" is text).
 */
export function createTagFilter() {
	let held = "";
	return {
		flush(): string {
			const rest = held;
			held = "";
			return rest;
		},
		push(s: string): string {
			let out = "";
			for (const ch of s) {
				if (ch === "[") {
					out += held;
					held = "[";
				} else if (held) {
					held += ch;
					if (ch === "]") {
						if (ALLOWED.has(held.slice(1, -1).trim().toLowerCase())) {
							out += held;
						}
						held = "";
					} else if (held.length > MAX_HELD) {
						out += held;
						held = "";
					}
				} else {
					out += ch;
				}
			}
			return out;
		},
	};
}

// Spaces inside the brackets too: the filter trims before it judges a tag.
const TAG_RE = new RegExp(
	`\\s*\\[\\s*(?:${AUDIO_TAGS.join("|")})\\s*\\]\\s*`,
	"gi"
);

/** The five tags out, for text that's read rather than heard (transcript, thread). */
export const stripAudioTags = (s: string) => s.replace(TAG_RE, " ").trim();
