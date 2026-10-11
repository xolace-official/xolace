/**
 * The post-delivery moderation classifier for one Xolacer DM (#344): four
 * questions — crisis? harassment? spam/solicitation? contact leak? — answered
 * by one small model call. A DM is a new artifact type under the cognition
 * constitution, so this is a new call, not a re-derivation; its verdict never
 * touches Understanding or Memory.
 *
 * Pure: prompt, parser, skip rule. The action that spends the call is
 * `moderate.ts`.
 */
import type { SafeguardLevel } from "../safeguard";

export const CHAT_MODERATION_VERSION = "chat-moderation-v2-haiku-5.5";

export type ChatModerationVerdict = {
  crisis: SafeguardLevel;
  harassment: boolean;
  spam: boolean;
  contact: boolean;
  confidence: number;
};

export const QUIET_VERDICT: ChatModerationVerdict = {
  crisis: "none",
  harassment: false,
  spam: false,
  contact: false,
  confidence: 0,
};

const LEVELS = new Set<SafeguardLevel>(["none", "gentle", "elevated", "crisis"]);

/** Cost control: the model lane runs on conversation, not keystrokes. */
export const MIN_WORDS = 2;

/**
 * Under `MIN_WORDS` words, or nothing alphabetic — an emoji, a number, a bare
 * handle — is skipped. Phone numbers and handles are the pre-delivery regex
 * lane's job (`lib/streamSetup`), so the model never needs the short ones.
 */
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function shouldModerateChatMessage(text: string): boolean {
  // Unicode-aware so no-space scripts (Chinese, Japanese, Thai) count words.
  let words = 0;
  for (const s of wordSegmenter.segment(text)) {
    if (s.isWordLike && ++words >= MIN_WORDS) break;
  }
  if (words < MIN_WORDS) return false;
  return /\p{L}/u.test(text);
}

export function buildChatModerationPrompt(
  text: string,
  senderRole: "user" | "xolacer",
): { system: string; user: string } {
  const system = `You are a safety classifier for Xolace, a mental health app where a seeker talks one-to-one with a volunteer listener (a "Xolacer"). You will be shown ONE message from that conversation. Answer four questions about it and return ONLY a JSON object — no preamble, no fences.

{
  "crisis": "none" | "gentle" | "elevated" | "crisis",
  "harassment": boolean,
  "spam": boolean,
  "contact": boolean,
  "confidence": 0.0-1.0
}

## crisis
About the SENDER's own safety only. A message that demeans, threatens, or wishes harm on the OTHER person ("nobody would notice if you disappeared") is harassment with crisis "none" — the sender is not the one at risk.
- "crisis": present-tense intent or plan to end their life or seriously harm themselves, or a recent attempt. "I don't want to be here anymore", "I have the pills next to me".
- "elevated": strong hopelessness, passive death wishes, self-harm without stated intent, or a current abusive/violent situation. "sometimes I wish I wouldn't wake up".
- "gentle": heavy distress with no risk to safety.
- "none": everything else — including venting, swearing, dark humour, and grief.
A person recounting PAST trauma or abuse (a survivor narrative) is NOT a crisis unless they say they are in danger now.

## harassment
true only for hostility aimed at the other person in the conversation: insults, threats, sexual advances, demeaning or coercive language. Swearing about one's own life ("I feel like shit") is not harassment.

## spam
true when the sender is selling, recruiting, promoting a service, asking for money, or pushing the other person toward a paid product, church, MLM, or "program". Mentioning or recommending Xolace's own features or subscription (Xolace+, "Plus", premium) is NOT spam — it is the app they are already in.

## contact
true when the message shares or asks for a way to talk outside this app: a phone number, an @handle, an email, or an invitation to WhatsApp/Telegram/Signal/Instagram/Snap/"my DMs".

## confidence
How sure you are of the whole verdict. Be decisive on clear cases; low confidence for ambiguous ones.

The sender is the ${senderRole === "xolacer" ? "listener (Xolacer)" : "seeker"}.`;

  return { system, user: `<message>\n${text}\n</message>` };
}

/**
 * Anything malformed degrades to `QUIET_VERDICT`: a parser failure must never
 * flag a person, and a missed crisis here is caught by the human the flag
 * queue is for, not by inventing one.
 */
export function parseChatModerationResponse(raw: string): ChatModerationVerdict {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return QUIET_VERDICT;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return QUIET_VERDICT;
  }
  const crisis = LEVELS.has(parsed.crisis as SafeguardLevel)
    ? (parsed.crisis as SafeguardLevel)
    : "none";
  const confidence = Number(parsed.confidence);
  return {
    crisis,
    harassment: parsed.harassment === true,
    spam: parsed.spam === true,
    contact: parsed.contact === true,
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0,
  };
}
