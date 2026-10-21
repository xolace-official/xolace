import type { CatalogEntry } from "./catalog";

/**
 * `try_<slug>` — something done away from the app (#567, CONTEXT.md
 * "try-this twig"). Wording and limits are curated here, never by the prompt:
 * no medical steps, no specific person, no crisis help, nothing costly to
 * undo. Evidence per entry: #560 (docs/research/try-this-catalog.md on
 * `research/try-this-catalog`).
 */
const TRY_PREFIX = /^try_/;
export const isTryThis = (actionType: string) => TRY_PREFIX.test(actionType);

function tryThis(
  slug: string,
  emotions: string[],
  themes: string[],
  title: string,
  detail: string,
  fits: string,
): CatalogEntry {
  return {
    actionType: `try_${slug}`,
    emotions,
    themes,
    supportNeedFit: ["light", "active"],
    premium: true,
    humanContact: false,
    alwaysAvailable: true,
    modelDescription: `Something to try away from the app: "${detail}" ${fits}`,
    title,
    detail,
  };
}

export const TRY_THIS: readonly CatalogEntry[] = [
  // Starter set (#567): strong/moderate evidence, spread across the emotions.
  tryThis(
    "brisk_walk",
    ["sadness", "anxiety", "numbness"],
    ["low-mood", "low-energy", "stuck", "tension", "momentum"],
    "A brisk walk",
    "Go for a 15–20 minute brisk walk today.",
    "Fits a low, stuck or wound-up day when they can get outside.",
  ),
  tryThis(
    "screens_off_hour",
    ["anxiety", "numbness"],
    ["screens", "winddown", "sleep", "racing-thoughts"],
    "Screens away before bed",
    "Put your phone and screens away an hour before bed tonight.",
    "Fits when nights, sleep or a mind that won't switch off came up.",
  ),
  tryThis(
    "muscle_release",
    ["anxiety", "fear", "anger"],
    ["tension", "release", "arousal", "unwinding"],
    "Tense, then let go",
    "Lie down and work from feet to face: tense each muscle group for a few seconds, then let it go.",
    "Fits when the feeling sits in the body as tension or a held-in charge.",
  ),
  tryThis(
    "friend_voice",
    ["shame", "guilt"],
    ["self-criticism", "not-enough", "self-talk", "perspective"],
    "What you'd tell a friend",
    "Write down the harshest thing you've told yourself today, then what you'd say to a friend who said it about themselves.",
    "Fits when the inner voice has been harsh.",
  ),
  tryThis(
    "one_enjoyable_thing",
    ["sadness", "numbness"],
    ["low-mood", "anhedonia", "flatness", "going-through-motions", "momentum"],
    "One thing you used to enjoy",
    "Pick one small thing you used to enjoy, put it in a time slot this week, and do it even if you don't feel like it.",
    "Fits a flat, going-through-the-motions stretch.",
  ),
];
