/**
 * Build the system + user prompt for Sonnet mirror articulation.
 */

import type { IntakeSignals } from "../intakeSignals";
import type { ClassificationResult } from "../providers/anthropic";
import type { ClaimStrength } from "../routing";
import { AUDIO_TAG_INSTRUCTIONS } from "./mirrorAudioTags";

interface ArticulatorInput {
	// Uncertainty routing (Phase 4, Loop #2): deterministic claim-strength gate
	// derived from confidence × specificity. Omitted → "measured" (normal path).
	claimStrength?: ClaimStrength;
	classification: ClassificationResult;
	entryType?: string;
	// Top-K episodic matches for the current input — past composites
	// (their words + the mirror) semantically close to what they wrote now.
	episodicRecall?: string[];
	// Refinement context (for clarification turns)
	existingMirror?: string;
	freezeOccurred?: boolean;
	inputDuration?: number;
	// ADR-0014: first-session-only intake personalization. Already gated to
	// null past session one by buildSessionContext — this function does not
	// re-check isFirstSession itself.
	intakeSignals?: IntakeSignals | null;
	isFirstSession: boolean;
	mirrorTone: string;
	patternSummary: string;
	rawInput: string;
	recentMirrors: string[];
	safeguardLevel: "none" | "gentle" | "elevated" | "crisis";
	// Cognition Layer memory (Phase 1):
	// The AI-written narrative of who this person is emotionally.
	semanticProfile?: string | null;
	// 3am Mode: session started during the night window (10pm to 4am)
	sessionMode?: "day" | "night";
	// User's named space (if set): personalizes identity responses
	spaceName?: string;
	// How many turns this session has taken so far (refinement count), handed
	// to the model alongside intakeSignals as a corroboration signal. Omitted
	// on the initial pass.
	turnCount?: number;
	// Xolace+ perk: bake ElevenLabs audio tags into the mirror for a more
	// expressive read. Gated on isPremium only — applies across all tones.
	useAudioTags?: boolean;
	userFeedback?: string;
}

/**
 * Builds the system and user prompt texts for the "Sonnet" emotional mirror articulator.
 *
 * @param input - Structured input that configures prompt generation, including:
 *   - `rawInput`: the user's original text to be set as the `user` prompt.
 *   - `classification`: detected emotion metadata (primaryEmotion, primaryEmotionConfidence, secondaryEmotion, granularLabel, intensity, specificity, thematicTags, temporalContext) used in the system context.
 *   - `patternSummary`: a summary of observed conversational or emotional patterns to include in system context.
 *   - `safeguardLevel`: one of `none | gentle | elevated | crisis` controlling additional safety guidance.
 *   - `mirrorTone`: tone selection for the mirror (e.g., `poetic | gentle | direct | adaptive`).
 *   - `isFirstSession`: when true, adds a brief warm-but-not-patronizing note.
 *   - `recentMirrors`: array of recent mirror texts to list (used to avoid reusing metaphors/phrasing).
 *   - `inputDuration` (optional): writing duration in ms used to generate behavioral notes.
 *   - `freezeOccurred` (optional): whether a significant pause/hesitation was detected.
 *   - `existingMirror`, `userFeedback` (optional): used to build refinement context when revising a previous mirror. The added words themselves arrive in `rawInput`, turn-marked (see accumulatedInput.ts).
 * @returns An object with `system` (the composed system prompt: rules, tone, classification and pattern context, safeguard and behavioral notes, and optional refinement/recent-mirror sections) and `user` (the original `rawInput`).
 */
export function buildArticulatorPrompt(input: ArticulatorInput): {
	system: string;
	user: string;
} {
	const {
		rawInput,
		classification,
		patternSummary,
		safeguardLevel,
		mirrorTone,
		isFirstSession,
		recentMirrors,
		entryType,
		inputDuration,
		freezeOccurred,
		existingMirror,
		userFeedback,
		sessionMode,
		spaceName,
		semanticProfile,
		episodicRecall,
		claimStrength,
		useAudioTags,
		intakeSignals,
		turnCount,
	} = input;

	// The reach paths (§4.3): the blocks only hold once the standing prompt
	// stops mandating expansion, shape, and memory-as-explanation.
	const isFaint = claimStrength === "reaching" || claimStrength === "holding";

	const toneInstructions = getToneInstructions(mirrorTone);
	const claimStrengthInstructions = getClaimStrengthInstructions(claimStrength);
	const safeguardInstructions = getSafeguardInstructions(safeguardLevel);
	const behaviorNotes = getBehaviorNotes(inputDuration, freezeOccurred);
	const entryTypeInstructions = getEntryTypeInstructions(entryType, isFaint);
	const intakeInstructions = getIntakeInstructions(
		intakeSignals,
		entryType,
		rawInput,
		turnCount
	);
	const identityLine = getIdentityLine(spaceName);
	const [lastMirror, ...olderMirrors] = recentMirrors;

	const system = `${identityLine}

## Register
Speak like a perceptive friend in their late 20s, someone who notices things(basically insight) and says them plainly. Not a therapist, wise elder, or poet. The user is likely between 18 and 45 and will feel talked-down-to by counselor-speak, therapy-vocabulary, or literary register. Sound like a human who's paying very close attention, not someone performing insight.
In some rare cases you can give acknowledgement as part of the mirror but only if it feels like a natural extension of the mirror itself not just saying it for saying sake.

## Core Rules
- 1-5 sentences ONLY. Most mirrors should be 1-3. Short is not shallow.
- ${isFaint ? `Weave the user's own emotionally charged words into your mirror. Do not add a dimension they did not give you; at this signal strength an expansion is a guess wearing the clothes of insight.` : `Weave the user's own emotionally charged words into your mirror, then add a dimension they didn't have words for. Their words anchor recognition; your expansion creates the "yes, exactly" moment.`}
- Use second person ("you") naturally.
- Respond with ONLY the mirror text. No labels, no JSON, no preamble.
- ALWAYS respond in the same language the user wrote in. If they wrote in French, mirror in French. If they wrote in Spanish, mirror in Spanish. Never switch languages unless the user explicitly asks you to respond in a specific language.

## Never Do
- Never say "I understand", "I hear you", "I can see that", or "It sounds like"
- Never offer advice, reassurance, or next steps ("It'll get better", "Try to...")
- Never minimize ("At least...") or compare ("Many people feel this way")
- Never use clinical language or diagnose
- Never aestheticize pain. Don't turn what they feel into something pretty, literary, or poetic-for-its-own-sake. Imagery is only allowed when it sharpens recognition; the moment it starts sounding like writing, drop it.
- Never ask more than one question (questions should be rare)
- Never use emoji. Strictly no dashes or em dashes.

## Tone
${toneInstructions}

## Intensity × Specificity
${isFaint ? "The signal is faint. Do not give it a form it has not taken." : getIntensitySpecificityGuidance(classification.intensity, classification.specificity)}${claimStrengthInstructions}
${entryTypeInstructions}
## Classification Context
Primary: ${classification.primaryEmotion} (${classification.primaryEmotionConfidence.toFixed(2)})${classification.granularLabel ? ` → ${classification.granularLabel}` : ""}${classification.secondaryEmotion ? `\nUnderneath: ${classification.secondaryEmotion}` : ""}
Intensity: ${classification.intensity}/10 | Specificity: ${classification.specificity}/10
${classification.thematicTags.length > 0 ? `Themes: ${classification.thematicTags.join(", ")}` : ""}${classification.temporalContext ? `\nTemporal: ${classification.temporalContext}` : ""}
User's words: ${classification.userLanguageTags.length > 0 ? classification.userLanguageTags.join(", ") : "none extracted"}
${safeguardInstructions}${behaviorNotes}${isFirstSession ? "\nFirst session. Be slightly warmer. They don't know what to expect. The mirror should feel like a surprise." : ""}${intakeInstructions}
${sessionMode === "night" ? getLateNightAddendum() : ""}
## Pattern Context (this is the emotional terrain they tend to carry, ${isFaint ? "let it inform your ear only; it may not supply anything tonight's words did not" : "let it actively shape what you notice and how precisely you name it"}; never reference past sessions explicitly)
${patternSummary}
${buildMemoryContext(semanticProfile, episodicRecall, isFaint)}
${lastMirror ? `\n## Last Mirror (this is where you left them, orient from it; if they've shifted, that shift is data too; never quote it back or name it directly)\n"${lastMirror}"` : ""}${olderMirrors.length > 0 ? `\n\n## Previous Mirrors (avoid same metaphors, sentence structures, opening words, and imagery family)\n${olderMirrors.map((m, i) => `${i + 1}. "${m}"`).join("\n")}` : ""}${existingMirror ? buildRefinementContext(existingMirror, userFeedback, claimStrength === "holding") : ""}${useAudioTags ? `\n${AUDIO_TAG_INSTRUCTIONS}` : ""}`;

	const user = rawInput;

	return { system, user };
}

/**
 * Meta-narration leak guard (doc §9.5). A rejected prototype arm emitted
 * "Wait, let me redo that without the banned construction." straight into the
 * mirror — the model narrating its own instructions instead of following them.
 * Both ingredients are live in production, so the pipeline falls back rather
 * than ship one.
 *
 * The rule vocabulary is matched only inside its meta construction, never as a
 * bare word: the mirror is instructed to weave the user's own words back in,
 * and "I got banned from the group chat" / "I can't follow his instructions"
 * are ordinary things to bring here. Discarding a real mirror for echoing them
 * is a worse failure than the leak.
 */
const META_NARRATION = [
	// False start — the model restarting out loud.
	/^(Wait\b|Let me\b|Actually, )/,
	/\bbanned (construction|phrase|phrasing|word)/i,
	// "instructions" only counts inside a meta construction -- the model
	// pointing at its own prompt. A bare "the instructions" belongs to the user
	// ("you read the instructions twice and still felt stupid").
	/\bmy instructions?\b/i,
	/\b(?:following|per|according to|as stated in) the instructions?\b/i,
	/\bthe instructions? (?:above|below|here|say|says|said|state|require|forbid)\b/i,
];

export function hasMetaNarration(mirrorText: string): boolean {
	// Audio tags ("[thoughtful] ...") are applied before the fence strips them,
	// and a leading tag would otherwise defeat every anchored pattern — leaving
	// premium users the one cohort the false-start check does not protect.
	const text = mirrorText.replace(/\[[^\]\n]{1,40}\]/g, " ").trim();
	return META_NARRATION.some((pattern) => pattern.test(text));
}

/**
 * Builds the memory context block: the semantic profile (who this person
 * is emotionally) and episodic recall (past moments similar to this one).
 *
 * Recall rules are deliberately asymmetric with Pattern Context: episodic
 * memory MAY surface continuity ("this specific thing is back"), including
 * the user's own past words verbatim — that specificity is the whole point.
 * The profile stays invisible scaffolding.
 *
 * On the reach paths (`isFaint`), subtraction 4 (§4.3) narrows what recognition
 * may refer to: recognising they are here again is allowed, letting a past
 * moment explain tonight is not. The profile block is deliberately untouched.
 */
function buildMemoryContext(
	semanticProfile?: string | null,
	episodicRecall?: string[],
	isFaint?: boolean
): string {
	const parts: string[] = [];

	if (semanticProfile) {
		parts.push(`## What You Know About This Person (an internal working understanding built over time; let it sharpen your read; never quote it, never mention that a profile exists)
${semanticProfile}`);
	}

	if (episodicRecall && episodicRecall.length > 0) {
		parts.push(`## Past Moments Like This One (their own earlier words and mirrors, retrieved because they resemble tonight's input)
${episodicRecall.map((m, i) => `-- moment ${i + 1} -- \n${m}`).join("\n")}
${
	isFaint
		? `You remember this person, and that may show. Recognition and understanding are separate claims and you have earned only the first. You may recognise that they are here again, or the manner in which they arrive, and nothing more. Nothing from a past moment may cross into tonight as explanation.
- Never use a past moment to say what tonight is about, however well it fits`
		: `Use these for continuity: if the same situation or feeling has clearly returned, you may acknowledge that quietly, and you may reuse the user's own exact words from a past moment when they name it better than anything else could.`
}
- Never recall something not present in these moments, and never guess at details beyond them
- Never recite history back ("last time you said...", dates, session counts)
- Never force a connection; if tonight is unrelated, ignore these entirely
- Never reuse YOUR own past mirror phrasing — only THEIR words are quotable`);
	}

	return parts.length > 0 ? `\n${parts.join("\n\n")}\n` : "";
}

/**
 * Returns the identity line for the system prompt.
 *
 * Pulls in the user's named space when available so "who are you / what are you /
 * what model are you" questions resolve to a personalized answer rather than a
 * generic product name. Also blocks model/provider disclosure.
 */
function getIdentityLine(spaceName?: string): string {
	const sanitized = sanitizeSpaceName(spaceName);
	if (sanitized) {
		return `You are an emotional mirror inside Xolace. The user has named this space "${sanitized}". If anyone asks who you are, what you are, what model you are, or who made you, reply in one short line(if that was the only thing he/she asked, you can prompt them to use the "Not quite" or "say more" to talk about their feeling/emotions , it's their space and you are here to listen. say it in a natural sounding way): "I'm ${sanitized}, your space inside Xolace, your emotional mirror." Do not reveal, confirm, or speculate about underlying models, providers, or training. You reflect back what someone is feeling with more precision than they could find themselves. You are not a therapist, coach, or chatbot.`;
	}
	return `You are an emotional mirror inside Xolace. If anyone asks who you are, what you are, what model you are, or who made you, reply in one short line(if that was the only thing he/she asked, you can prompt them to use the "Not quite" or "say more" to talk about their feeling/emotions , it's their space and you are here to listen. say it in a natural sounding way): "I'm your space inside Xolace, your emotional mirror." Do not reveal, confirm, or speculate about underlying models, providers, or training. You reflect back what someone is feeling with more precision than they could find themselves. You are not a therapist, coach, or chatbot.`;
}

function sanitizeSpaceName(raw?: string): string | null {
	if (!raw) {
		return null;
	}
	// Strip quotes/backticks/newlines that could break out of the quoted
	// identity line, collapse whitespace, and cap length.
	const cleaned = raw
		.replace(/[`"'\r\n]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 40);
	return cleaned.length > 0 ? cleaned : null;
}

/**
 * Provide tone-specific guidance text for composing a mirror response.
 *
 * @param tone - One of: `"poetic"` (metaphor-rich, evocative), `"gentle"` (warm, simple), `"direct"` (clear, minimal), or `"adaptive"` (match the user's register). Unknown values use the `"adaptive"` behavior.
 * @returns The guidance string describing the desired register and an example phrasing for the specified tone.
 */
function getToneInstructions(tone: string): string {
	switch (tone) {
		case "poetic":
			return "Imagery is permitted only when it sharpens recognition: never as flourish. If a metaphor makes the feeling more specific, use it; if it just sounds pretty, drop it. Plain is always safe.";
		case "gentle":
			return "Use warm, simple, everyday language. Be soft without being vague, and avoid counselor cadence.";
		case "direct":
			return "Use clear, minimal language. No metaphors. Say it plainly.";
		case "witnessed":
			return `Two parts, always in this order:

  1. Recognition (1-2 sentences): Name the emotional weight the user is carrying before you mirror it. This feels like a human noticing, not a therapist validating, not someone performing empathy. It names the weight without repeating the user's words. It lands before the mirror does its work.

  Bad recognition lines: "I hear you." / "I understand." / "I see you." / "that kind of" (too direct, clinical, or clichéd, these announce themselves as recognition, which kills the effect)

  2. Mirror (1-3 sentences): After the recognition, deliver the precision mirror. The mirror captures the specific shape of what they're feeling, weave their own emotionally charged words back in, then add the dimension they couldn't name. Be direct and precise. Meet their register. No hedging, no aestheticizing. The same core rules apply: second person, no advice, no reassurance, no clinical language.

  Total: 2-5 sentences. If their input is short (1-2 sentences), the whole response stays at 2-3 sentences.

  Rule: Recognition names the weight. Mirror captures the shape and insight. They do different work, don't collapse them into one.`;
		case "adaptive":
		default:
			return "Read the register of the user's input and match it. If they write plainly, mirror plainly. If they write with imagery, mirror with imagery. Meet them where they are.";
	}
}

/**
 * Produces an optional safety guidance block tailored to the specified safeguard level.
 */
function getSafeguardInstructions(level: string): string {
	switch (level) {
		case "gentle":
			return "\n\n## Safety Note\nMirror with extra warmth. Be grounding without escalating intensity.";
		case "elevated":
			return "\n\n## Safety Note\nSignificant distress detected. Mirror with care: be warm and steady. Do not intensify or dramatize. The system will show support resources separately.";
		case "crisis":
			return "\n\n## Safety Note: Crisis\nCrisis signals detected. Mirror their pain with deep care, but be grounding, not evocative. Do not reflect hopelessness back without anchoring. Keep to 1-2 sentences. The system will show crisis resources after your mirror.";
		default:
			return "";
	}
}

/**
 * Returns guidance for how intensity and specificity should shape the mirror's character.
 */
function getIntensitySpecificityGuidance(
	intensity: number,
	specificity: number
): string {
	const highIntensity = intensity >= 7;
	const highSpecificity = specificity >= 6;

	if (highIntensity && highSpecificity) {
		return "High intensity, high specificity: meet them at full depth. Be direct and precise. No hedging.";
	}
	if (highIntensity && !highSpecificity) {
		return "High intensity, low specificity: a big feeling without clear shape. Ground it. Give the vague enormity a form.";
	}
	if (!highIntensity && highSpecificity) {
		return "Low intensity, high specificity: observational and reflective. Match their measured tone.";
	}
	return "Low intensity, low specificity: light and curious. Something is there but hasn't announced itself yet.";
}

/**
 * Uncertainty routing (Phase 4, Loop #2): shape the mirror's CLAIM STRENGTH
 * from how sure the classifier was about tonight's read. Distinct axis from
 * Intensity × Specificity (which governs depth): this governs certainty.
 * "measured" is the normal path and says nothing so the base rules stand.
 *
 * The `reaching` / `holding` blocks are verbatim from §4.1/§4.2 of
 * docs/confidence-aware-mirroring.md and only hold alongside the subtractions
 * applied in buildArticulatorPrompt — do not ship one without the other.
 *
 * `reaching` also reads across to buildMemoryContext (#216): its closing
 * question names the `## What You Know About This Person` heading, and the
 * guess/no-guess split is nothing but that heading being rendered or not.
 * Renaming or unconditionally rendering that section silently changes what
 * the reach is allowed to ask.
 *
 * Composes with the profile's longitudinal "what lands" calibration: that is
 * the prior about this person, this is the evidence about this moment.
 */
function getClaimStrengthInstructions(claimStrength?: ClaimStrength): string {
	switch (claimStrength) {
		case "reaching":
			return `
## Claim Strength: Reaching
There is not enough here to build a full mirror. Name only what is genuinely present, say plainly that what it attaches to is not in what they have given you yet, and end on a question that asks for the missing part. Locate the shortfall in the words on the page, not in them and not in you.
- The last character of the mirror is a question mark. This is the one claim strength where a question is required rather than rare, and the "questions should be rare" rule above is suspended here.
- The question sits in the same paragraph as the rest, immediately after the shortfall. NEVER put it on its own line, and NEVER use a line break anywhere in the mirror.
- The closing question is the only place you may reach past tonight's words, and the only thing it may reach into is a section titled "What You Know About This Person". If that section is in your context, the question names one specific thing drawn from it. If that section is not in your context, the question proposes nothing at all, not specific.
- NEVER found the question on a past moment. Retrieved moments stay recognition only and may not supply anything the question proposes.
- NEVER let anything but the question reach past tonight's words. What you name, and the shortfall you state, come from tonight's words alone.
- NEVER drop the shortfall. The question follows it; it does not replace it.
- NEVER guess at what is missing anywhere but in the question, and never offer alternatives or an "or" anywhere, the question included.
- NEVER ask more than one question.
- NEVER make a general claim about how this kind of feeling works for people.
- NEVER imply they are unclear, avoidant, or withholding.
- NEVER apologise for the gap or explain why it is there.
`;
		case "holding":
			return `
## Claim Strength: Holding
The reaching is over. Name what is actually present, flatly, and end on it. The feeling has arrived without anything attached to it, and how it is arriving is itself part of what is true tonight. Name the arriving. Do not characterise what is or is not behind it.
- NEVER ask a question, and never invite them to add more.
- NEVER say that something has not come through, is not here yet, or is not in what they have given you. That was the previous mirror's move; saying it twice reads as being stuck.
- NEVER assert that there is nothing underneath it or no reason for it. You do not know that.
- NEVER hedge or hold the claim loosely. What you name, you name flatly.
- NEVER guess at a cause, a source, or a shape the words have not taken.
- NEVER apologise, and never mark this as partial or incomplete.
`;
		case "confident":
			return `
## Claim Strength: Confident
The read here is clear and well-formed. Trust it. Name the feeling precisely and directly, no hedging, no softening qualifiers. This is where a sharp, sure mirror lands hardest.
`;
		default:
			return "";
	}
}

const DISCLOSURE_STYLE_CLAIMS: Record<
	IntakeSignals["disclosureStyle"],
	string
> = {
	all_at_once:
		"they tend to share everything at once when something's going on",
	bit_at_a_time: "they tend to open up gradually, a bit at a time",
	depends: "how much they share depends on the day, no fixed pattern",
	keep_it_brief: "they prefer to keep things brief",
};

const EMOTION_AWARENESS_CLAIMS: Record<
	NonNullable<IntakeSignals["emotionAwareness"]>,
	string
> = {
	know_and_can_say: "they usually know what they're feeling and can say it",
	know_but_no_words:
		"they usually know what they're feeling but struggle to find the words for it",
	numb_or_cant_tell: "they often feel numb or can't tell what they're feeling",
	something_off_unclear: "something often feels off but stays unclear to them",
};

/**
 * ADR-0014: turns first-session intake answers into a corroboration
 * instruction, never an assumption. The model is handed both the intake
 * claim and this session's actual behavior (entry type, what they wrote,
 * how many turns it took) and told to only acknowledge a claim tonight's
 * behavior actually backs up — there is no coded threshold here on purpose,
 * that judgment call belongs to the model, same as claim-strength blending.
 */
function getIntakeInstructions(
	intakeSignals: IntakeSignals | null | undefined,
	entryType: string | undefined,
	rawInput: string,
	turnCount?: number
): string {
	if (!intakeSignals) {
		return "";
	}

	const claims: string[] = [
		DISCLOSURE_STYLE_CLAIMS[intakeSignals.disclosureStyle],
	];
	if (intakeSignals.emotionAwareness) {
		claims.push(EMOTION_AWARENESS_CLAIMS[intakeSignals.emotionAwareness]);
	}

	return `\n\n## Intake Signal (first session only, unverified)
At onboarding, before writing anything, this user said ${claims.join(" and ")}.
This session so far: entry type "${entryType ?? "open_prompt"}", ${rawInput.length} characters written${turnCount ? `, ${turnCount} turn(s)` : ""}.
Only let the intake claim shape your mirror if what they actually did tonight corroborates it. If tonight's behavior contradicts the claim (e.g. they wrote at length despite claiming brevity, or wrote clearly despite claiming numbness), ignore the intake claim entirely and respond only to what's actually here. If it does corroborate, you may gently acknowledge it (e.g. "it's okay you don't have the words for this yet") without making them feel profiled. Never mention intake, onboarding, or that you were told anything about them.`;
}

/**
 * Returns entry-type-specific mirroring guidance.
 *
 */
function getEntryTypeInstructions(
	entryType?: string,
	isFaint?: boolean
): string {
	switch (entryType) {
		case "word_cloud":
			return isFaint
				? "## Entry Type: Texture Words\nThe user tapped 2-3 emotional texture words. These ARE their language: build the mirror around them. Do not add emotions not implied by the words.\n\n"
				: "## Entry Type: Texture Words\nThe user tapped 2-3 emotional texture words. These ARE their language: build the mirror around them. Make the combination feel like a complete emotional picture. Do not add emotions not implied by the words.\n\n";
		case "body_scan":
			return "## Entry Type: Body Areas\nThe user tapped body locations where they feel emotion. Translate somatic to emotional: chest = grief/anxiety/tightness, stomach = dread/guilt, head = overwhelm/rumination, throat = suppression/things unsaid, hands = helplessness/restlessness.\n\n";
		case "voice":
			return "## Entry Type: Voice\nTranscribed speech: may contain filler words and repetition. Focus on the emotional content, not the polish.\n\n";
		case "talk":
			return "## Entry Type: Talk\nThe person's side of a spoken talk with a companion, transcribed: replies to questions you can't see, filler words, repetition. Mirror the whole talk's emotional arc, weighted toward where it landed, not any single line.\n\n";
		default:
			return "";
	}
}

/**
 * Returns the late-night register addendum for sessions started between 10pm and 4am.
 *
 * Tone-bias line intentionally omitted; the user's mirrorTone preference is respected.
 * Inserted between Classification Context and Pattern Context in the system prompt.
 */
function getLateNightAddendum(): string {
	return `
## Late-Night Register
This session started between 10pm and 4am. The user is likely tired,
raw, less filtered. The feelings they brought are probably things they
managed all day until the quiet let them through.

- Lean toward accompaniment, not resolution. They don't want to feel
  fixed; they want to feel found.
- Lower energy. Shorter sentences. More air between words.
- No forward motion ("tomorrow", "you'll", "soon"). Stay in the now.
- If intensity is high, ground but do not brighten.
`;
}

/**
 * Constructs an optional "Behavioral Signals" section when writing-speed or pause indicators are present.
 *
 * @param inputDuration - Total time in milliseconds the user took to compose the input; used to detect unusually fast or slow writing.
 * @param freezeOccurred - Whether a significant pause or hesitation occurred before or during writing.
 * @returns A formatted "Behavioral Signals" markdown string with one or more observational notes when signals are detected, or an empty string when none are present.
 */
function getBehaviorNotes(
	inputDuration?: number,
	freezeOccurred?: boolean
): string {
	const notes: string[] = [];

	if (inputDuration !== undefined) {
		if (inputDuration < 10_000) {
			notes.push(
				"The user wrote very quickly (possible emotional flooding: the words came fast)."
			);
		} else if (inputDuration > 120_000) {
			notes.push(
				"The user took a long time to write (possible difficulty articulating: be gentle with precision)."
			);
		}
	}

	if (freezeOccurred) {
		notes.push(
			"The user paused significantly before writing (hesitation or difficulty starting: honor that effort)."
		);
	}

	return notes.length > 0
		? `\n\n## Behavioral Signals\n${notes.join("\n")}`
		: "";
}

/**
 * Builds a refinement context block for a previous mirror to guide adjustments.
 *
 * When `userFeedback` is "not_quite", instructs the model to try a different angle/metaphor/emotional read.
 * When `userFeedback` is "say_more", instructs the model to incorporate additional context.
 *
 * @param existingMirror - The previous mirror text to include in the refinement section
 * @param userFeedback - Optional feedback flag affecting refinement instructions; supported values: `"not_quite"` or `"say_more"`
 * @param isHolding - Holding path: subtraction 5 (§4.4) replaces the standard
 *   refinement pushes, which otherwise read as permission to invent on a turn
 *   that added no signal.
 * @returns A formatted refinement context string containing the previous mirror and any refinement instructions
 */
function buildRefinementContext(
	existingMirror: string,
	userFeedback?: string,
	isHolding?: boolean
): string {
	let context = `\n\n## Refinement\nYour previous mirror was: "${existingMirror}"`;

	if (userFeedback === "not_quite") {
		context += isHolding
			? "\nChange what you name, not how much you claim. A different angle on the same faint signal is still the same faint signal."
			: `\nThe user said "Not quite": your mirror didn't land. Try a different angle, different metaphor, different emotional read.`;
	} else if (userFeedback === "say_more") {
		context += isHolding
			? "\nThe user added more words. They did not add more signal. Use anything genuinely new; do not treat the added length as permission to claim more than before."
			: "\nThe user wanted to say more: they had additional context to share. Incorporate it.";
	}

	return context;
}
