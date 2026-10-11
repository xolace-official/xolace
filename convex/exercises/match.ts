import { freeEmotionFamily } from "../lib/understandingVocab";

export type MatchInput = {
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  userLanguageTags: string[];
  entryType: string;
  confirmationState: "confirmed" | "refined" | "gave_up" | "abandoned";
};

export type ExerciseTitle =
  | "let_it_land"
  | "find_your_edges"
  | "make_room"
  | "speak_to_it"
  | "soften_toward_it"
  | "reset";

const HIGH_ACTIVATION = new Set([
  "anxiety", "panic", "dread", "overwhelm", "terror",
]);
const NUMB = new Set([
  "numbness", "dissociation", "flatness", "anhedonia",
]);
const STUCK = new Set([
  "helplessness", "despair", "hopelessness",
]);
const SHAME = new Set([
  "shame", "guilt", "embarrassment",
]);
const ANGER = new Set([
  "anger", "frustration", "rage", "resentment",
]);

const NUMB_TAGS = new Set([
  "numb", "empty", "foggy", "blank", "hollow", "flat",
  "dissociated", "checked out", "disconnected",
]);
const STUCK_TAGS = new Set([
  "stuck", "trapped", "heavy", "paralyzed", "frozen",
  "can't move", "can't start",
]);
const SHAME_TAGS = new Set([
  "shame", "worthless", "failing", "not enough",
  "broken", "defective",
]);
const ANGER_TAGS = new Set([
  "angry", "furious", "rage", "resentment", "betrayal",
  "violated",
]);

function hasTag(tags: string[], set: Set<string>): boolean {
  return tags.some((t) => set.has(t.toLowerCase()));
}

/** Returns ranked exercises (primary + fallbacks). Never returns an empty list. */
export function matchExercise(input: MatchInput): ExerciseTitle[] {
  const { primaryEmotion, granularLabel, intensity, userLanguageTags, confirmationState } = input;
  // Family, so a finer emotion (stress) steers like its parent (anxiety) — ADR 0018,
  // and a free-text granular label (worried) like the emotion it means (#536).
  const words = [...freeEmotionFamily(primaryEmotion), ...(granularLabel !== undefined ? freeEmotionFamily(granularLabel) : [])];
  const matches = (set: Set<string>) => words.some((w) => set.has(w));

  if (confirmationState === "gave_up" || confirmationState === "abandoned") {
    return ["reset", "let_it_land", "find_your_edges", "make_room", "speak_to_it", "soften_toward_it"];
  }

  if (intensity >= 8 || matches(HIGH_ACTIVATION)) {
    return ["reset", "let_it_land", "make_room", "find_your_edges", "speak_to_it", "soften_toward_it"];
  }

  if (matches(NUMB) || hasTag(userLanguageTags, NUMB_TAGS)) {
    return ["find_your_edges", "let_it_land", "reset", "make_room", "speak_to_it", "soften_toward_it"];
  }

  if (matches(STUCK) || hasTag(userLanguageTags, STUCK_TAGS)) {
    return ["make_room", "let_it_land", "reset", "find_your_edges", "speak_to_it", "soften_toward_it"];
  }

  if (matches(SHAME) || hasTag(userLanguageTags, SHAME_TAGS)) {
    return ["soften_toward_it", "let_it_land", "make_room", "reset", "find_your_edges", "speak_to_it"];
  }

  if (matches(ANGER) || hasTag(userLanguageTags, ANGER_TAGS)) {
    return ["speak_to_it", "make_room", "let_it_land", "reset", "find_your_edges", "soften_toward_it"];
  }

  return ["let_it_land", "make_room", "soften_toward_it", "find_your_edges", "reset", "speak_to_it"];
}
