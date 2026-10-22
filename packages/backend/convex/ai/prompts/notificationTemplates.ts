export type NotificationTemplateType =
  | "gentle_return"
  | "pattern_nudge"
  | "affirmation";

type TemplateKey = `${"warm" | "direct" | "quiet"}_${NotificationTemplateType}`;

const TEMPLATES: Record<TemplateKey, string[]> = {
  warm_gentle_return: [
    "The door is still open.",
    "Quiet here. You're welcome back when you're ready.",
    "No rush. Just noticing you haven't stopped by.",
    "Something might be waiting to be named.",
    "Still here. No pressure, just presence.",
    "A lot can accumulate in a few days. This is a safe place to set some of it down.",
    "Whenever you're ready, there's space here.",
    "You don't have to have it figured out to come back.",
    "The heavy ones don't have to stay heavy.",
    "Not pushing. Just leaving the light on.",
  ],
  warm_pattern_nudge: [
    "This is usually your time. The space is ready if you are.",
    "You tend to process around now. What's here today?",
    "Your usual time. Nothing required — just available.",
    "You've been here before at this hour. What's sitting with you?",
    "A familiar time. Something to set down?",
    "This quiet moment tends to be yours.",
    "Usually around now, you check in with yourself.",
    "Your time, if you want it.",
    "The hour you normally stop and notice.",
    "Evening check-in, if you want it.",
  ],
  direct_gentle_return: [
    "You haven't been by in a while. Something worth processing?",
    "A few days have passed. What's accumulated?",
    "It's been quiet here. What's loud out there?",
    "You usually process more regularly. Something in the way?",
    "Time passes. Things accumulate. This is where you put them.",
    "Still here. Back when it makes sense.",
    "A few days out. What's weighing on you?",
    "You know how to use this. Back when you're ready.",
    "The gap between sessions can be useful. Or it can be avoidance. Either is fine to name.",
    "No pressure, but the gap is getting longer.",
  ],
  direct_pattern_nudge: [
    "This is usually when you sit with things.",
    "You tend to check in around now. Tonight too?",
    "Your pattern says this is processing time. Is it?",
    "You've been here at this hour before.",
    "Consistently, this is when you process. What's on?",
    "Same time you usually show up.",
    "You usually use this hour for this.",
    "Your slot. Take it or leave it.",
    "Pattern match: this is your usual time.",
    "You've been here before at this exact hour.",
  ],
  quiet_gentle_return: [
    "Still here.",
    "Whenever.",
    "No rush.",
    "The space is here.",
    "When you're ready.",
    "Quiet, as always.",
    "Nothing urgent. Just present.",
    "This is here when you need it.",
    "The door's still open.",
    "Come back when it helps.",
  ],
  quiet_pattern_nudge: [
    "Your usual time.",
    "Usually around now.",
    "This is your hour, if you want it.",
    "Here, as you tend to be.",
    "Still here, as always.",
    "Your time.",
    "Same as before.",
    "The quiet hour.",
    "Present, as usual.",
    "If now works.",
  ],
  // Affirmation pool — lines that don't reference the app at all.
  // Could have come from a friend's text thread. No "come back", no
  // pattern replay, no "space". Break the gravitational pull of every
  // other template type orbiting re-engagement.
  warm_affirmation: [
    "Being tired doesn't mean you're failing.",
    "You're allowed to not be performing today.",
    "The version of you that showed up this week was enough.",
    "Not every hard day is a warning sign. Some are just hard days.",
    "Rest counts as progress too.",
    "You don't have to earn your way into being okay.",
    "Slow days are still days you're here for.",
    "Hard to feel it, but you're doing better than you think.",
    "The fact that you care is not nothing.",
    "It's fine to not have a reason for feeling off.",
  ],
  direct_affirmation: [
    "Hard week. Doesn't mean you broke.",
    "Being off today isn't evidence of anything.",
    "Tired is information, not a verdict.",
    "You can be struggling and still be fine.",
    "Some days just cost more. That's all.",
    "Not every low is a trend.",
    "Feeling flat isn't failing.",
    "You don't owe anyone a good week.",
    "The bar doesn't have to be high right now.",
    "Showing up once this week counts.",
  ],
  quiet_affirmation: [
    "You're doing fine.",
    "Enough for today.",
    "This counts.",
    "You're allowed to rest.",
    "Hard days happen.",
    "Still worth it.",
    "You're okay.",
    "Quiet is allowed.",
    "No need to push.",
    "That's enough.",
  ],
};

/**
 * Pick a template for a cold-start user (sessionCount < 3).
 * Filters out recently used content strings to avoid repetition.
 */
export function pickTemplate(
  reach: "warm" | "direct" | "quiet",
  notificationType: NotificationTemplateType,
  recentlyUsedContent: string[]
): { content: string; generatedBy: "template_cold_start" | "template_fallback" } {
  const key: TemplateKey = `${reach}_${notificationType}`;
  const pool = TEMPLATES[key] ?? TEMPLATES[`warm_${notificationType}`];

  const recentSet = new Set(recentlyUsedContent.slice(0, 3));
  const filtered = pool.filter((t) => !recentSet.has(t));
  const available = filtered.length > 0 ? filtered : pool;

  const content = available[Math.floor(Math.random() * available.length)];
  return { content, generatedBy: "template_cold_start" };
}

/**
 * Pick a fallback template when Haiku generation fails.
 */
export function pickFallbackTemplate(
  reach: "warm" | "direct" | "quiet",
  notificationType: NotificationTemplateType,
  recentlyUsedContent: string[]
): { content: string; generatedBy: "template_cold_start" | "template_fallback" } {
  const { content } = pickTemplate(reach, notificationType, recentlyUsedContent);
  return { content, generatedBy: "template_fallback" };
}

/**
 * Reach-weighted probability of substituting an affirmation in place of a
 * re-engagement notification (gentle_return / pattern_nudge). Warm users get
 * the highest mix; quiet users almost never do.
 */
const AFFIRMATION_MIX: Record<"warm" | "direct" | "quiet", number> = {
  warm: 0.28,
  direct: 0.15,
  quiet: 0.05,
};

export function shouldSubstituteAffirmation(
  reach: "warm" | "direct" | "quiet",
  sourceType: "gentle_return" | "pattern_nudge"
): boolean {
  // Milestone-ish re-engagement types only. Pattern_nudge gets a lower
  // effective rate because pattern_nudge *is* the user's time slot; breaking
  // that frame with an unrelated affirmation is jarring.
  const base = AFFIRMATION_MIX[reach];
  const rate = sourceType === "pattern_nudge" ? base * 0.5 : base;
  return Math.random() < rate;
}
