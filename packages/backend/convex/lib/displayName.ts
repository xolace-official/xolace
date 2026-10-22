const NAMES = [
	"Wren",
	"River",
	"Sage",
	"Cedar",
	"Vale",
	"Fern",
	"Lumen",
	"Mist",
	"Dusk",
	"Ash",
	"Reed",
	"Birch",
	"Lyra",
	"Haze",
	"Cloud",
	"Stone",
	"Cove",
	"Flint",
	"Glen",
	"Sable",
	"Haven",
	"Soleil",
	"Briar",
	"Crest",
];

export function generateDisplayName(): string {
	return NAMES[Math.floor(Math.random() * NAMES.length)];
}

// Deterministic fallback name for users created before displayName existed.
// Consistent per-profile so the same user always sees the same name.
export function seededDisplayName(profileId: string): string {
	let hash = 0;
	for (const ch of profileId) {
		hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	}
	return NAMES[hash % NAMES.length];
}

export const DISPLAY_NAME_MAX_LENGTH = 30;

export type DisplayNameValidation =
	| { ok: true; trimmed: string }
	| { ok: false; message: string };

/** Emoji and symbols are allowed — only emptiness and length are policed. */
export function validateDisplayName(name: string): DisplayNameValidation {
	const trimmed = name.trim();
	if (!trimmed) {
		return { message: "Name cannot be empty", ok: false };
	}
	if ([...trimmed].length > DISPLAY_NAME_MAX_LENGTH) {
		return { message: `${DISPLAY_NAME_MAX_LENGTH} characters max`, ok: false };
	}
	return { ok: true, trimmed };
}
