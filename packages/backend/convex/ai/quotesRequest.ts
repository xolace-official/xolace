// Model call + retry loop for session-derived quotes.
// V8 runtime — Anthropic SDK uses fetch, no Node built-ins needed.

import {
  getAnthropicClient,
  extractTextFromResponse,
  thinkingOff,
  DISTILLER_MODEL,
} from "./providers/anthropic";
import { parseQuoteResponse } from "./quotesPrompt";
import { validateQuote, validateTitle } from "./quotesQuality";

const RETRY_NUDGE =
  "That attempt did not land — it ran long, drifted into explaining the reader, or was not valid JSON. Write it again: one breath, around 20 words, no interpretation, JSON only.";

/**
 * Ask the model for a quote, validate it, and retry once with a nudge back
 * toward aphorism shape rather than dropping the user's quote for the day.
 * Returns null when both attempts fail.
 *
 * The title is soft (#310): a rejected title comes back `undefined` alongside a
 * valid quote and never spends a retry — a user does not lose their quote for
 * the day over a plate.
 *
 * `label` only appears in logs (the emotional profile id at the call site).
 */
export async function requestQuoteText(args: {
  systemPrompt: string;
  userPrompt: string;
  label: string;
}): Promise<{ text: string; title?: string } | null> {
  const client = getAnthropicClient();
  const prompts = [args.userPrompt, `${args.userPrompt}\n\n${RETRY_NUDGE}`];

  for (const prompt of prompts) {
    let response;
    try {
      response = await client.messages.create({
        model: DISTILLER_MODEL,
        max_tokens: 400,
        thinking: thinkingOff(DISTILLER_MODEL),
        messages: [{ role: "user", content: prompt }],
        system: args.systemPrompt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[quotesDistiller] API call failed for ${args.label}: ${message}`);
      continue;
    }

    const rawText = extractTextFromResponse(response).trim() || null;

    if (!rawText) {
      console.error(`[quotesDistiller] Empty response for ${args.label}`);
      continue;
    }

    const parsed = parseQuoteResponse(rawText);
    if (!parsed) {
      console.error(
        `[quotesDistiller] Unparseable response for ${args.label}: ${rawText.slice(0, 160)}`
      );
      continue;
    }

    console.log(
      `[quotesDistiller] Seeds for ${args.label}: ${parsed.seeds.join(" | ") || "(none)"}`
    );

    const validation = validateQuote(parsed.quote);
    if (!validation.ok) {
      console.error(
        `[quotesDistiller] Quote failed validation for ${args.label}: ${validation.reason}`
      );
      continue;
    }

    let title: string | undefined;
    if (parsed.title) {
      const titleCheck = validateTitle(parsed.title, parsed.quote);
      if (titleCheck.ok) {
        title = parsed.title;
      } else {
        console.warn(
          `[quotesDistiller] Title rejected for ${args.label} (quote kept): ${titleCheck.reason}`
        );
      }
    }

    return { text: parsed.quote, title };
  }

  return null;
}
