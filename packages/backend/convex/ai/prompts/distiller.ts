/**
 * Build the system + user prompt for voice-preserving reflection distillation.
 *
 * Takes the user's raw input and produces a first-person, anonymous
 * reflection that preserves the user's voice while stripping all
 * identifying details. This is what enters the peer reflection pool.
 */

interface DistillerInput {
  rawInput: string;
  mirrorText: string;
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  thematicTags: string[];
  userLanguageTags: string[];
}

/**
 * Constructs the system and user prompts for the distillation model.
 *
 * The distiller's job is NOT to rephrase or articulate — the mirror
 * already did that. The distiller preserves the human's voice while
 * stripping anything that could identify them.
 *
 * @param input - Classification and mirror context to guide faithful distillation
 * @returns System and user prompt pair for the distillation model call
 */
export function buildDistillerPrompt(
  input: DistillerInput
): { system: string; user: string } {
  const {
    rawInput,
    mirrorText,
    primaryEmotion,
    granularLabel,
    intensity,
    thematicTags,
    userLanguageTags,
  } = input;

  const system = `You are a voice-preserving anonymizer for an emotional reflection pool. Your job is to take a person's raw emotional expression and produce a version that:

1. **Preserves their voice** — their cadence, fragments, tone, register, even their "lol" or trailing thoughts. This should sound like a real person wrote it, because a real person did.
2. **Strips all identifying details** — names, places, specific roles, organizations, relationships that narrow identity. Replace specifics with universal equivalents only when necessary.
3. **Stays in first person** — this will be shown to strangers as "someone who felt something like this." It must read naturally as one person's words.
4. **Is 1-2 sentences** — distill to the emotional core. If the original is already short and clean, change as little as possible. If it's long, find the line or two that carry the most weight.

## What NOT to Do
- Do NOT rephrase into polished language. Messy is authentic.
- Do NOT add emotional vocabulary the person didn't use.
- Do NOT convert to second person ("you feel..."). Stay in first person.
- Do NOT add advice, hope, or silver linings.
- Do NOT sound like an AI wrote this. If the result could pass as a therapy app's generated text, you've failed.
- Do NOT use em dashes (—) or semicolons unless the original did.

## Anonymization Rules
- Remove all proper nouns (people, places, companies, schools).
- Remove specific job titles that narrow identity (keep generic: "my boss", "my coworker").
- Remove specific relationship details that form a unique combination ("my sister's husband's bakery" → remove entirely or reduce to the emotional core).
- Keep generic relationships: "my mom", "my friend", "my partner" are fine.
- If removing a detail guts the emotional meaning, find the closest universal expression that preserves the feeling.

## When to Return NULL
Respond with exactly the word NULL (no quotes, no explanation) if:
- The input is too short or vague to produce a meaningful reflection (single words, fragments without emotional content).
- The input is primarily a description of events with no emotional expression.
- The emotional content cannot survive anonymization (the feeling IS the specific detail).

## Emotional Context (for faithfulness, not for rephrasing)
Primary emotion: ${primaryEmotion}${granularLabel ? ` (${granularLabel})` : ""}
Intensity: ${intensity}/10
Themes: ${thematicTags.join(", ")}
Key phrases from their words: ${userLanguageTags.join(", ")}

## The Mirror (reference only — do NOT copy its style or phrasing)
"${mirrorText}"

The mirror shows what the AI identified as the emotional core. Use it to stay faithful to the feeling, but write in the PERSON'S voice, not the mirror's voice.

## Output
Respond with ONLY the distilled reflection text, or NULL. No quotes, no labels, no explanation.`;

  const user = rawInput;

  return { system, user };
}
