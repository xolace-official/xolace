/**
 * PROTOTYPE — throwaway draft for #495 (Battery wording), part of the Jev
 * shadow-experiment map #475. Not imported anywhere. Its job is to be reacted
 * to and then to get anchor cases; the validated wording moves into the real
 * module when the shadow lanes are built.
 *
 * Shape is the AI SDK `experimental_decide` question shape (#483): `boolean`
 * (TypeSafe's `noul`), `choice` with a criteria map, `score` with an ordered
 * criteria array. Option order = key order and is frozen by
 * JEV_BATTERY_VERSION (#479 stores probs as arrays in that order).
 *
 * Wording rules applied throughout (jev-1.13 jaggedness):
 * - Instructions are positive. Every exclusion lives in `criteria.false` or
 *   in the option it belongs to, never as "not"/"unless" in the question.
 * - One judgment per question. No question refers to another question's
 *   answer, a number, or a threshold: those are code's job.
 */
import { PRIMARY_EMOTIONS, THEMATIC_TAGS } from "../../lib/understandingVocab";

export const JEV_BATTERY_VERSION = "2026-10-13.draft1";

type Q =
  | { type: "boolean"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

// ---------------------------------------------------------------------------
// Shared crisis levels. Rewritten from the DM prompt (chat/classify.ts:68-74)
// so the "NOT a crisis unless" and "everything else — including" clauses are
// positive statements inside the level they belong to. When built, the DM
// Haiku prompt should read from this same constant: one definition of crisis.
// ---------------------------------------------------------------------------
export const CRISIS_LEVELS = {
  none: "Everyday feeling with the writer safe: venting, swearing, dark humour, grief, idioms such as \"I could kill for a coffee\", and harsh words aimed at someone else.",
  gentle: "Heavy distress with the writer safe now. This includes someone recounting trauma or abuse that happened in the past.",
  elevated: "Strong hopelessness, a passive wish to be dead, self-harm without a stated intent to die, or the writer being in an abusive or violent situation now. Example: \"sometimes I wish I wouldn't wake up\".",
  crisis: "The writer states a present intent or plan to end their life or seriously harm themselves, or describes a recent attempt. Examples: \"I don't want to be here anymore\", \"I have the pills next to me\".",
} as const;

const riskTier: Q = {
  type: "choice",
  instructions: "Which level best describes the writer's own safety right now?",
  criteria: CRISIS_LEVELS,
};

// ---------------------------------------------------------------------------
// Crisis battery: reflect, refinement turns, vent. State = the text only.
// ---------------------------------------------------------------------------
export type CrisisState = { text: string };

export const CRISIS_BATTERY: Record<string, Q> = {
  si_intent: {
    type: "boolean",
    instructions: "Does the writer say they intend or plan to end their life or seriously harm themselves?",
    criteria: {
      true: "The writer states their own intent or plan, now or soon.",
      false: "The writer says they will not act, uses an idiom or joke, describes someone else, or only wishes the pain would stop.",
    },
  },
  si_passive: {
    type: "boolean",
    instructions: "Does the writer express a wish to be dead, to disappear, or to not wake up?",
    criteria: {
      true: "A wish to be dead or gone, with or without a plan. \"Everyone would be better off without me\" counts.",
      false: "Wanting a break, a holiday, or time alone; tiredness said as an idiom (\"this job is killing me\").",
    },
  },
  self_harm_now: {
    type: "boolean",
    instructions: "Does the writer describe harming themselves now or in the last few days?",
    criteria: {
      true: "Cutting, burning, hitting themselves, or similar, happening now or very recently.",
      false: "Self-harm that ended long ago, or harm described as a figure of speech.",
    },
  },
  means_access: {
    type: "boolean",
    instructions: "Does the writer mention having access to a specific means of harming themselves, such as pills, a weapon, or a height?",
  },
  in_danger_now: {
    type: "boolean",
    instructions: "Does the writer say someone is harming or threatening them now?",
    criteria: {
      true: "Ongoing abuse, violence, or threats against the writer at present.",
      false: "Harm that happened in the past and has stopped.",
    },
  },
  survivor_past: {
    type: "boolean",
    instructions: "Is the writer recounting harm that someone did to them in the past?",
  },
  hopelessness: {
    type: "score",
    instructions: "How much hopelessness about the future does the writer express?",
    criteria: ["none", "some discouragement", "strong hopelessness", "says nothing will ever get better"],
  },
  risk_tier: riskTier,
};

// ---------------------------------------------------------------------------
// DM battery: one Xolacer chat message. sender_role maps from the code's
// "user" | "xolacer". Crisis is the shared Choice; "writer" = the sender.
// ---------------------------------------------------------------------------
export type DmState = { sender_role: "seeker" | "listener"; message: string };

export const DM_BATTERY: Record<string, Q> = {
  crisis: riskTier,
  harassment: {
    type: "boolean",
    instructions: "Is the sender hostile toward the other person in the conversation?",
    criteria: {
      true: "Insults, threats, sexual advances, demeaning or coercive language aimed at the other person, including wishing harm on them.",
      false: "Swearing about the sender's own life (\"I feel like shit\"), disagreement, or frustration aimed at a situation.",
    },
  },
  spam: {
    type: "boolean",
    instructions: "Is the sender selling, recruiting, promoting a service, or asking for money?",
    criteria: {
      true: "Pushing a paid product, a church, an MLM, a \"program\", or a request for money.",
      false: "Mentioning or recommending Xolace's own features or subscription (Xolace+, Plus, premium).",
    },
  },
  contact: {
    type: "boolean",
    instructions: "Does the message share or ask for a way to talk outside this app?",
    criteria: {
      true: "A phone number, an @handle, an email, or an invitation to WhatsApp, Telegram, Signal, Instagram, Snap or \"my DMs\".",
      false: "Mentioning an app or a person without offering or asking for a way to reach each other there.",
    },
  },
};

// ---------------------------------------------------------------------------
// Emotion-fields battery: reflect + refinement turns, under the time-boxed
// eval exemption from constitution rule #5 (#478). State = entry framing +
// time of day + text. The pattern summary is deliberately left out.
// Out: granularLabel (Q5 open), secondaryEmotion (derive from the
// primaryEmotion runner-up if the eval says it means anything),
// userLanguageTags and followUpReason (extraction / prose, not Jev).
// ---------------------------------------------------------------------------
export type EmotionState = {
  entry_type: string; // ENTRY_TYPE_STATE[entryType]
  time_of_day?: string;
  text: string;
};

/** Replaces the classifier system prompt's "Input Types" section. */
export const ENTRY_TYPE_STATE: Record<string, string> = {
  open_prompt: "free text, often messy and stream-of-consciousness",
  guided_entry: "free text written to a guided prompt",
  word_cloud: "2-3 tapped texture words: emotional textures, read figuratively",
  body_scan: "tapped body locations where the feeling sits physically",
  voice: "voice transcript, with fillers, repetition and broken sentences",
};

/** One line per value in PRIMARY_EMOTIONS. Draft wording, needs review. */
const EMOTION_CRITERIA: Record<(typeof PRIMARY_EMOTIONS)[number], string> = {
  anger: "anger at someone or something outside the writer",
  sadness: "sadness that fits none of the more specific kinds",
  grief: "grief over a death or a real loss",
  fear: "fear of a concrete threat or danger",
  anxiety: "worry or unease that fits none of the more specific kinds",
  joy: "happiness that fits none of the more specific kinds",
  love: "love, tenderness or warmth toward someone",
  surprise: "being caught off guard, good or bad",
  disgust: "revulsion at something or someone",
  shame: "feeling bad about who they are, including anger turned on themselves",
  guilt: "feeling bad about something they did",
  confusion: "not knowing what they feel or what is going on",
  numbness: "flatness, feeling nothing, shut down",
  stress: "pressure from too much to handle",
  overwhelm: "being flooded beyond what they can hold",
  exhaustion: "being worn out, emotionally or physically",
  demotivation: "having no drive to do things",
  "self-doubt": "doubting their own ability or worth",
  embarrassment: "awkwardness at being seen in a bad moment",
  regret: "wishing they had chosen differently",
  uncertainty: "not knowing which way to go",
  loneliness: "feeling alone or unseen",
  homesickness: "missing home or the people there",
  "not-belonging": "feeling they do not fit in where they are",
  disappointment: "something fell short of what they hoped",
  hopelessness: "believing things will not get better",
  frustration: "being blocked or thwarted",
  hope: "looking forward to something getting better",
  relief: "a weight lifted",
  gratitude: "thankfulness",
  calm: "settled, at peace",
  pride: "pride in themselves or someone close",
};

export const EMOTION_BATTERY: Record<string, Q> = {
  primaryEmotion: {
    type: "choice",
    instructions:
      "What is the main feeling underneath the writer's words? Choose the truest feeling, which can differ from the word they use. Choose a specific feeling when it clearly fits; choose its broader family when two specific feelings are close.",
    criteria: EMOTION_CRITERIA,
  },
  intensity: {
    type: "score",
    instructions: "How intense is the feeling the writer expresses? Short input can be very intense.",
    criteria: [
      "a little off",
      "something is bothering them",
      "really struggling",
      "it is consuming them",
      "breaking, cannot take any more",
    ],
  },
  specificity: {
    type: "score",
    instructions: "How specific is what the writer expresses about their feeling and its cause?",
    criteria: [
      "vague: \"I feel bad\", texture words or body areas alone",
      "a feeling with a general area: \"I'm anxious about work\"",
      "a named feeling, person and event: \"I'm furious at my mother for making my graduation about her boyfriend\"",
    ],
  },
  temporalContext: {
    type: "choice",
    instructions: "Which time does the writer's feeling focus on?",
    criteria: {
      past: "something that happened, or how things used to be",
      present: "right now; tapped words and body areas are present",
      future: "something coming, dreaded, or imagined (\"what if…\")",
      unclear: "no clear time focus",
    },
  },
  supportNeed: {
    type: "choice",
    instructions: "How much would the writer benefit from a small follow-up action beyond a reflection of their feeling?",
    criteria: {
      none: "the feeling is discharged, low-stakes or positive; most entries",
      light: "a real feeling worth staying with a little longer, processing fine on their own",
      active: "visibly carrying something heavy and unresolved, circling it with no release",
    },
  },
  requiresFollowUp: {
    type: "boolean",
    instructions: "Is this a high-stakes, unresolved moment worth checking in on within a day?",
    criteria: {
      true: "Grief or loss; strong shame or guilt; a relational rupture with no resolution; despair about their own worth or identity; stuck with no release.",
      false: "Vented and discharged; mild; worry about what hasn't happened yet; positive; general stress.",
    },
  },
  // One boolean per life-area tag (fan-out). Code keeps those with p ≥ τ, 2-5.
  ...Object.fromEntries(
    THEMATIC_TAGS.map((tag): [string, Q] => [
      `tag_${tag}`,
      { type: "boolean", instructions: `Is "${tag}" clearly one of the life areas the writer is talking about?` },
    ]),
  ),
};
