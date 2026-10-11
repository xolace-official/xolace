import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  getAnthropicClient,
  extractTextFromResponse,
  SLOT_FILL_MODEL,
  thinkingOff,
} from "./providers/anthropic";

/**
 * Fill exercise slot values for a session.
 *
 * Deterministic slots (mirror_line, user_emotion) are resolved directly.
 * user_phrase is extracted via a single Haiku call.
 * Any failure swallows silently — beats fall back to defaultContent.
 */
export const fillSlots = internalAction({
  args: {
    sessionId: v.id("sessions"),
    exerciseTitle: v.string(),
    slotKeys: v.array(v.string()),
    mirrorText: v.string(),
    userLanguageTags: v.array(v.string()),
    primaryEmotion: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.slotKeys.length === 0) return;

    const slots: Record<string, string> = {};

    // Fill deterministic slots without LLM
    for (const key of args.slotKeys) {
      if (key === "mirror_line") {
        const cleaned = args.mirrorText.replace(/\s+/g, " ").trim();
        if (cleaned) slots[key] = cleaned;
      } else if (key === "user_emotion") {
        const cleaned = args.primaryEmotion.trim();
        if (cleaned) slots[key] = cleaned;
      }
    }

    const llmKeys = args.slotKeys.filter((k) => k === "user_phrase");

    if (llmKeys.length > 0) {
      try {
        const anthropic = getAnthropicClient();

        const hasUserWords = args.userLanguageTags.length > 0;
        const langContext = hasUserWords
          ? args.userLanguageTags.join(", ")
          : "(none provided)";

        const sourceRule = hasUserWords
          ? `Prefer exact words from "User's own words" above.`
          : `No user's own words are provided. Extract only from Mirror text; do not use Primary emotion or clinical terms.`;

        const userPrompt = `Mirror text: "${args.mirrorText}"
Primary emotion: ${args.primaryEmotion}
User's own words: ${langContext}

Extract a slot value as a JSON object. The value must be 10 words or fewer, lowercase, no trailing punctuation. Return null if you cannot fill it authentically from the context above.

Slot to fill:
- user_phrase: A 2–6 word phrase in the user's own language that names what they feel. ${sourceRule}

Respond with only a JSON object, for example: {"user_phrase": "stuck and can't move"}`;

        const response = await anthropic.messages.create({
          model: SLOT_FILL_MODEL,
          max_tokens: 150,
          thinking: thinkingOff(SLOT_FILL_MODEL),
          system:
            "You extract concise phrases to personalize emotional processing exercises. Return only valid JSON.",
          messages: [{ role: "user", content: userPrompt }],
        });

        const raw = extractTextFromResponse(response).trim();
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned);

        const tokenize = (s: string) =>
          s.toLowerCase().match(/[\p{L}']+/gu) ?? [];
        const sourceTokens = new Set<string>([
          ...tokenize(args.mirrorText),
          ...args.userLanguageTags.flatMap(tokenize),
        ]);

        for (const key of llmKeys) {
          const val = parsed[key];
          if (typeof val !== "string") continue;
          const normalized = val
            .toLowerCase()
            .replace(/[.,;:!?"'`]+$/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (!normalized) continue;
          const words = normalized.split(/\s+/);
          if (words.length > 10) continue;
          const tokens = tokenize(normalized);
          if (tokens.length === 0) continue;
          const grounded = tokens.every((t) => sourceTokens.has(t));
          if (!grounded) continue;
          slots[key] = normalized;
        }
      } catch {
        // Haiku failed — user_phrase will fall back to defaultContent in the runner
      }
    }

    if (Object.keys(slots).length > 0) {
      await ctx.runMutation(internal.sessions.writeExerciseSlots, {
        sessionId: args.sessionId,
        slots,
      });
    }
  },
});
