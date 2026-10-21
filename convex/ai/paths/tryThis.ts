import type { CatalogEntry } from "./catalog";
import { freeEmotionFamily } from "../../lib/understandingVocab";

/**
 * `try_<slug>` — something done away from the app (#567, CONTEXT.md
 * "try-this twig"). Wording and limits are curated here, never by the prompt:
 * no medical steps, no specific person, no crisis help, nothing costly to
 * undo. Evidence per entry: #560 (docs/research/try-this-catalog.md on
 * `research/try-this-catalog`).
 */
const TRY_PREFIX = /^try_/;
export const isTryThis = (actionType: string) => TRY_PREFIX.test(actionType);

/**
 * Try-this entries in prompt order (#571): most tags shared with tonight's
 * Understanding first, catalog order on a tie. Emotions meet through their
 * family (stress meets anxiety); their own words meet a theme as a slug
 * ("racing thoughts" meets racing-thoughts). Only a nudge: every entry stays.
 */
export function rankTryThis<T extends Pick<CatalogEntry, "emotions" | "themes">>(
  entries: readonly T[],
  u: { primaryEmotion: string; thematicTags: string[]; userLanguageTags: string[] },
): T[] {
  const emotions = new Set(freeEmotionFamily(u.primaryEmotion));
  const themes = new Set([...u.thematicTags, ...u.userLanguageTags].map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")));
  const score = (e: T) => e.emotions.filter((x) => emotions.has(x)).length + e.themes.filter((x) => themes.has(x)).length;
  return entries.map((e, i) => ({ e, i, s: score(e) })).sort((a, b) => b.s - a.s || a.i - b.i).map(({ e }) => e);
}

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
  // Sleep and winding down
  tryThis("screens_off_hour", ["anxiety", "numbness"], ["screens", "winddown", "sleep", "racing-thoughts"],
    "Screens away before bed",
    "Put your phone and screens away an hour before bed tonight.",
    "Fits when nights, sleep or a mind that won't switch off came up."),
  tryThis("same_wake_time", ["anxiety", "sadness"], ["consistency", "sleep", "exhaustion"],
    "The same wake-up time",
    "Get up at the same time tomorrow, even if tonight is a rough one. Keep it for the week.",
    "Fits when sleep has come loose and the days feel shapeless."),
  tryThis("get_up_after_20", ["anxiety"], ["sleep", "racing-thoughts", "restlessness", "arousal"],
    "Get up if sleep won't come",
    "If you're still awake after about 20 minutes, get up, do something quiet in dim light, and go back to bed when you feel sleepy.",
    "Fits lying awake with a busy mind."),
  tryThis("warm_bath_before_bed", ["anxiety", "numbness"], ["winddown", "unwinding", "tension", "sleep"],
    "A warm bath before bed",
    "Have a warm shower or bath an hour or two before bed.",
    "Fits a wound-up evening or trouble falling asleep."),
  tryThis("tomorrow_list", ["anxiety", "confusion"], ["racing-thoughts", "overload", "sleep", "winding-down"],
    "Tomorrow, on paper",
    "Before bed, write down what tomorrow needs, so it sits on paper rather than in your head.",
    "Fits when tomorrow's tasks keep circling at night."),
  // Rest and recovery
  tryThis("stop_work_at_set_time", ["anxiety", "numbness"], ["work", "burnout", "exhaustion", "pressure", "depletion"],
    "A set time to stop",
    "Pick a time to stop working tonight and stop then. Close the laptop and mute work notifications.",
    "Fits when work keeps spilling into the evening."),
  tryThis("day_off", ["numbness", "sadness"], ["burnout", "exhaustion", "recovery", "permission"],
    "A day that's actually off",
    "Take one day off this week that is actually off, with no catching up.",
    "Only when their own words point to burnout; a day of leave costs something."),
  tryThis("time_for_yourself", ["numbness", "sadness"], ["depletion", "exhaustion", "permission", "too-much"],
    "Time that's only yours",
    "Block out one evening (or an hour) this week that's only yours, and protect it.",
    "Fits when they give everything out and nothing comes back in."),
  // Moving the body
  tryThis("brisk_walk", ["sadness", "anxiety", "numbness"], ["low-mood", "low-energy", "stuck", "tension", "momentum"],
    "A brisk walk",
    "Go for a 15–20 minute brisk walk today.",
    "Fits a low, stuck or wound-up day when they can get outside."),
  tryThis("green_walk", ["anxiety", "sadness"], ["rumination", "racing-thoughts", "disconnection", "grounding", "openness"],
    "A walk somewhere green",
    "Walk somewhere green (a park, trees, water) for 20 minutes or more, with your phone away. Aim for about two hours of it across the week.",
    "Fits a mind going round in circles."),
  tryThis("gentle_stretch", ["sadness", "anxiety", "anger"], ["tension", "release", "softening", "held-in"],
    "A slow stretch",
    "Spend 10–15 minutes on slow stretching or gentle yoga before bed.",
    "Fits a feeling held in the body."),
  tryThis("muscle_release", ["anxiety", "fear", "anger"], ["tension", "release", "arousal", "unwinding"],
    "Tense, then let go",
    "Lie down and work from feet to face: tense each muscle group for a few seconds, then let it go.",
    "Fits when the feeling sits in the body as tension or a held-in charge."),
  // Attention
  tryThis("mindful_minutes", ["anxiety", "confusion"], ["quiet-mind", "presence", "awareness", "racing-thoughts", "stillness"],
    "Ten quiet minutes",
    "Sit for 10 minutes and notice your breath and the sounds around you. When your mind wanders, bring it back. Try it on a few days this week.",
    "Fits a noisy, scattered mind."),
  tryThis("mindful_everyday", ["numbness", "confusion"], ["disconnection", "going-through-motions", "noticing", "presence"],
    "One thing, slowly",
    "Do one everyday thing slowly and on purpose (a shower, washing up, a cup of tea), noticing how it actually feels.",
    "Fits feeling on autopilot or far from their own life."),
  tryThis("name_the_feeling", ["anxiety", "anger", "confusion"], ["noticing", "awareness", "spiraling"],
    "Name it as it rises",
    "When the feeling rises, silently label it: \"this is anxiety\", \"this is anger\". Then go back to what you were doing.",
    "Fits a feeling that takes over before they notice it."),
  tryThis("cool_off_before_reply", ["anger", "disgust"], ["conflict", "resentment", "injustice", "held-in"],
    "Twenty minutes before you reply",
    "Before you answer the message or moment that made you angry, step away for 20 minutes and do something calming. Don't vent, and don't go for a run.",
    "Fits anger at someone they still have to answer."),
  // Worry and problems
  tryThis("worry_time", ["anxiety", "fear"], ["worry", "rumination", "spiraling", "overanalysis", "dread"],
    "A set time to worry",
    "Set 15 minutes this evening as worry time. Write the worries down then, and during the day tell them \"later\".",
    "Fits worry that runs all day."),
  tryThis("one_problem_steps", ["confusion", "anxiety"], ["indecision", "overload", "stuck", "clarity", "simplification"],
    "One problem, one step",
    "Take the one problem that's loudest. Write the options, pick one, and decide when you'll do the first step this week. If it's not something you can act on, set it down for tonight.",
    "Fits being stuck on a decision or a problem."),
  tryThis("drop_one_thing", ["anxiety", "confusion"], ["overwhelm", "too-much", "pressure", "overload", "simplification"],
    "Drop one thing",
    "Look at this week's list and drop, delay or shrink one thing.",
    "Fits a week with too much in it."),
  // Writing it down
  tryThis("expressive_writing", ["sadness", "anger", "shame", "confusion"], ["held-in", "letting-go", "catharsis"],
    "Write what's weighing on you",
    "On a few nights this week, write for 15–20 minutes about what's weighing on you: the feelings, not only the events. You can throw it away after.",
    "Fits something held in that hasn't had anywhere to go."),
  tryThis("unsent_letter", ["grief", "sadness", "love"], ["loss", "missing-someone", "death", "regret"],
    "A letter you won't send",
    "Write a letter to the one you've lost, saying what you didn't get to say. It isn't sent.",
    "Fits grief with something left unsaid."),
  tryThis("friend_voice", ["shame", "guilt"], ["self-criticism", "not-enough", "self-talk", "perspective"],
    "What you'd tell a friend",
    "Write down the harshest thing you've told yourself today, then what you'd say to a friend who said it about themselves.",
    "Fits when the inner voice has been harsh."),
  tryThis("self_compassion_letter", ["shame", "guilt", "sadness"], ["self-compassion", "regret", "should-be-over-this", "acceptance"],
    "A kind letter to yourself",
    "Write yourself a short letter about the thing you're hard on yourself for, the way a kind friend would write it.",
    "Fits being hard on themselves over something done or not done."),
  tryThis("three_good_things", ["joy", "sadness"], ["gratitude", "heaviness", "low-mood", "warmth"],
    "Three things that went OK",
    "Tonight, write three things that went OK today and why.",
    "Fits a heavy stretch, or a good day worth keeping."),
  // Doing
  tryThis("one_enjoyable_thing", ["sadness", "numbness"], ["low-mood", "anhedonia", "flatness", "going-through-motions", "momentum"],
    "One thing you used to enjoy",
    "Pick one small thing you used to enjoy, put it in a time slot this week, and do it even if you don't feel like it.",
    "Fits a flat, going-through-the-motions stretch."),
  tryThis("five_minute_start", ["anxiety", "shame", "fear"], ["avoidance", "stuck", "momentum", "self-talk"],
    "Five minutes of it",
    "Take the task you've been avoiding and do five minutes of it. You can stop after.",
    "Fits a task they keep putting off."),
  tryThis("make_something", ["sadness", "numbness", "joy"], ["disconnection", "playfulness", "catharsis", "delight"],
    "Make something",
    "Spend half an hour making something: draw, write, play or sing, build or fix something.",
    "Fits feeling flat or cut off, or wanting to put a feeling somewhere."),
  tryThis("learn_something", ["numbness", "sadness"], ["stuck", "renewal", "possibility", "drive"],
    "Learn something small",
    "Spend 20 minutes learning something new: a few words of a language, a how-to, a skill you've meant to try.",
    "Fits feeling stuck in the same days."),
  tryThis("savour_moment", ["joy", "love"], ["delight", "lightness", "warmth", "presence"],
    "Stay with the good bit",
    "When something good happens this week, stop and stay with it for a minute instead of moving straight on.",
    "Fits a good moment they rushed past."),
  // Being with others
  tryThis("small_kindness", ["sadness", "shame", "love"], ["not-enough", "warmth", "loneliness"],
    "One small kindness",
    "Do one small kind thing this week: help a neighbour, thank someone properly, hold the door.",
    "Fits feeling low, alone or not good enough."),
  tryThis("join_a_group", ["sadness", "love"], ["loneliness", "isolation", "relationships", "disconnection"],
    "One local group",
    "Go to one free local group built around something you like: a walking group, choir, class or library event.",
    "Fits loneliness when they could get out."),
  tryThis("volunteer_once", ["sadness", "numbness"], ["loneliness", "isolation", "not-enough", "drive"],
    "Volunteer once",
    "Find one volunteering slot this week, even a one-off.",
    "Fits loneliness, or feeling of no use to anyone."),
  // Screens and news
  tryThis("news_at_set_times", ["anxiety", "fear"], ["dread", "uncertainty", "vigilance", "spiraling", "news"],
    "The news at set times",
    "Check the news once or twice today at set times, and not in the hour before bed.",
    "Fits dread fed by the news."),
  tryThis("social_media_break", ["sadness", "anxiety", "shame"], ["loneliness", "insecurity", "not-enough", "screens", "comparison"],
    "A break from social media",
    "Take a week off social media, or cap it at about 30 minutes a day.",
    "Fits comparing themselves to others online."),
];
