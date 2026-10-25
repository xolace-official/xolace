export const SPACE_NAME_MAX_LENGTH = 20;
export const SPACE_NAME_VALID_RE = /^[A-Za-z0-9-]+$/;

export const SPACE_NAME_CRISIS_BLOCKLIST = [
	"kill",
	"die",
	"suicide",
	"suicid",
	"hurt",
	"dead",
	"death",
	"harm",
	"selfharm",
	"self-harm",
	"cut",
	"bleed",
] as const;

// The space name is also the companion's name (#601): it never passes for
// another AI or a clinician. Matched against the whole name (letters only)
// and each hyphen/camel-case part, so "ChatGPT", "Dr-Maya" and "DrJones" are
// caught but "Drew" and "Claudette" are not.
export const SPACE_NAME_DENYLIST = new Set([
	"chatgpt",
	"gpt",
	"openai",
	"claude",
	"anthropic",
	"gemini",
	"bard",
	"google",
	"copilot",
	"bing",
	"siri",
	"alexa",
	"cortana",
	"llama",
	"meta",
	"mistral",
	"grok",
	"xai",
	"deepseek",
	"perplexity",
	"replika",
	"character",
	"characterai",
	"doctor",
	"dr",
	"therapist",
	"psychiatrist",
	"psychologist",
	"counselor",
	"counsellor",
	"clinician",
	"physician",
	"nurse",
	"psychotherapist",
]);

function deniedName(name: string): boolean {
	const parts = name
		.split(/[-0-9]+|(?=[A-Z][a-z])/)
		.map((p) => p.toLowerCase());
	return [name.toLowerCase().replace(/[^a-z]/g, ""), ...parts].some((p) =>
		SPACE_NAME_DENYLIST.has(p)
	);
}

export type SpaceNameValidation =
	| { ok: true; trimmed: string }
	| { ok: false; message: string };

export function validateSpaceName(name: string): SpaceNameValidation {
	const trimmed = name.trim();
	if (!trimmed) {
		return { message: "Name cannot be empty", ok: false };
	}
	if (trimmed.length > SPACE_NAME_MAX_LENGTH) {
		return { message: `${SPACE_NAME_MAX_LENGTH} characters max`, ok: false };
	}
	if (/\s/.test(trimmed)) {
		return { message: "No spaces allowed", ok: false };
	}
	if (!SPACE_NAME_VALID_RE.test(trimmed)) {
		return { message: "Letters, numbers, and hyphens only", ok: false };
	}
	const lower = trimmed.toLowerCase();
	for (const term of SPACE_NAME_CRISIS_BLOCKLIST) {
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (new RegExp(`\\b${escaped}\\b`).test(lower)) {
			return { message: "That's not a name we can use here", ok: false };
		}
	}
	if (deniedName(trimmed)) {
		return {
			message: "That name belongs to someone else. Pick another?",
			ok: false,
		};
	}
	return { ok: true, trimmed };
}
