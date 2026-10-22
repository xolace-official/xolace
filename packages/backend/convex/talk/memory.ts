/**
 * What the companion knows of the person during a talk (#598, decisions in
 * #580). Pure; `remember.ts` reads the data. The preload is rendered once at
 * talk start and rides in the cached prompt prefix; recalled moments change
 * per turn and ride after it.
 */
import type { IntakeSignals } from "../ai/intakeSignals";
import type { AnthropicTurn } from "../ai/talk/openaiCompat";
import { type TalkCue, withCue } from "./clock";

export type PastMoment = {
	createdAt: number;
	entryType: string;
	primaryEmotion: string;
	granularLabel?: string;
	thematicTags: string[];
	userLanguageTags: string[];
	temporalContext?: string;
};

// The companion's standing rule (#580): overrides the mirror articulator's
// rules for its own spoken turns only.
const RULES = `How you speak about their past:
- Bring it up naturally when it fits. You may recite it back ("last time you said…", "last time we talked…"). Paraphrase by default; quote their exact words only when the moment calls for it.
- Asked what you remember about them, answer honestly in plain words from what is here, and say this memory is theirs to control.
- Never expose the machinery: no emotion or life-area labels, no scores or ratings, no safety verdicts, never "your profile says" or "my notes say".
- The feeling word on each moment below is a label, not their words: never say it back ("you were feeling joy"). Speak from their words instead.`;

const MEMORY_OFF = `${RULES}

Their memory is off: you know nothing of them beyond this talk. Asked what you remember, say so plainly, and that turning memory on is their choice.`;

const ENTRY: Record<string, string> = {
	body_scan: "a body scan",
	guided_entry: "a guided reflection",
	talk: "a talk with you",
	voice: "a voice reflection",
	word_cloud: "a word-cloud reflection",
};

const DISCLOSURE: Record<IntakeSignals["disclosureStyle"], string> = {
	all_at_once: "tend to share everything at once",
	bit_at_a_time: "open up a bit at a time",
	depends: "share differently depending on the day",
	keep_it_brief: "like to keep it brief",
};

const AWARENESS: Record<
	NonNullable<IntakeSignals["emotionAwareness"]>,
	string
> = {
	know_and_can_say: "usually know what they feel and can name it",
	know_but_no_words: "often know what they feel but lack the words",
	numb_or_cant_tell: "sometimes feel numb or can't tell",
	something_off_unclear: "often sense something is off without knowing what",
};

const DAY = 24 * 60 * 60 * 1000;

function ago(ms: number, now: number): string {
	const days = Math.floor((now - ms) / DAY);
	if (days < 1) {
		return "earlier today";
	}
	if (days === 1) {
		return "yesterday";
	}
	if (days < 14) {
		return `${days} days ago`;
	}
	if (days < 60) {
		return `${Math.round(days / 7)} weeks ago`;
	}
	return `${Math.round(days / 30)} months ago`;
}

const when = (m: { createdAt: number; entryType: string }, now: number) =>
	`${ago(m.createdAt, now)}, ${ENTRY[m.entryType] ?? "a written reflection"}`;

/** The preload: rules plus what's known of them. With memory off, the rules and nothing else. */
export function renderMemory(
	input: {
		memoryOn: boolean;
		profile: string | null;
		moments: PastMoment[];
		intake: IntakeSignals | null;
	},
	now: number
): string {
	if (!input.memoryOn) {
		return MEMORY_OFF;
	}
	const parts = [
		RULES,
		"What you know of them, from their past reflections and talks:",
	];
	if (input.profile) {
		parts.push(`Who they are, in short:\n${input.profile}`);
	}
	if (input.moments.length) {
		const lines = input.moments.map((m) =>
			[
				`${when(m, now)}: ${m.granularLabel ?? m.primaryEmotion}`,
				m.thematicTags.length ? `about ${m.thematicTags.join(", ")}` : null,
				m.userLanguageTags.length
					? `their words: ${m.userLanguageTags.join(", ")}`
					: null,
				m.temporalContext ?? null,
			]
				.filter(Boolean)
				.join("; ")
		);
		parts.push(
			`Their recent moments, newest first:\n${lines.map((l) => `- ${l}`).join("\n")}`
		);
	} else if (!input.profile) {
		parts.push("Nothing yet: this is the start.");
	}
	if (input.intake) {
		const hints = [DISCLOSURE[input.intake.disclosureStyle]];
		if (input.intake.emotionAwareness) {
			hints.push(AWARENESS[input.intake.emotionAwareness]);
		}
		parts.push(
			`From their sign-up, a hint to check against what they say: they ${hints.join(", and ")}. Never mention this.`
		);
	}
	return parts.join("\n\n");
}

// ponytail: a memory is cut to its opening; enough for "last time you said…".
const RECALL_CHARS = 600;

/**
 * One recalled moment for the next turn: the episodic composite without its
 * labels line (emotion, intensity, tags), dated. Null when labels are all
 * there is (a crisis or memory-off moment is embedded that way).
 */
export function recallLine(
	m: { text: string; createdAt: number; entryType: string },
	now: number
): string | null {
	const words = m.text
		.split("\n\n")
		.filter((p) => !p.startsWith("emotion: "))
		.join("\n\n")
		.trim();
	if (!words) {
		return null;
	}
	const cut =
		words.length > RECALL_CHARS ? `${words.slice(0, RECALL_CHARS)}…` : words;
	return `${when(m, now)}: ${cut}`;
}

/** The per-turn tail: moments recalled from what they just said. */
export function renderRecall(lines: string[]): string {
	if (!lines.length) {
		return "";
	}
	return `Past moments that may connect to what they just said. Bring one up only if it truly fits:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

/**
 * The turn's system blocks: the agent's prompt and the preload as the cached
 * prefix, then the recall, the safety skill (#599) and the clock cue, which
 * change turn to turn.
 */
export function talkSystem(
	agentSystem: string,
	memory: { memory: string; recall: string } | null,
	turns: AnthropicTurn[],
	cue: TalkCue,
	safety = ""
) {
	const prefix = [agentSystem, memory?.memory].filter(Boolean).join("\n\n");
	const tail = withCue(
		[memory?.recall, safety].filter(Boolean).join("\n\n"),
		turns,
		cue
	);
	return [
		...(prefix
			? [
					{
						cache_control: { type: "ephemeral" as const },
						text: prefix,
						type: "text" as const,
					},
				]
			: []),
		...(tail ? [{ text: tail, type: "text" as const }] : []),
	];
}

/**
 * A "Say more" reopening's prefix (#604): the talk so far, which its new
 * conversation doesn't carry. Fixed for the reopening, so it caches.
 */
export function renderEarlier(
	lines: { role: "person" | "companion"; text: string }[]
): string {
	const thread = lines
		.map((l) => `${l.role === "person" ? "Them" : "You"}: ${l.text}`)
		.join("\n");
	return `This talk so far. They saw their mirror and came back to say more; pick up where it left off, without greeting them as if new or going over it again:\n${thread}`;
}
