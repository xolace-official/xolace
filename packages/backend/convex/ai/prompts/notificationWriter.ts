export type NotificationReach = "warm" | "direct" | "quiet";

export type NotificationContext = {
  notificationType: "gentle_return" | "pattern_nudge" | "affirmation";
  reach: NotificationReach;
  sessionCount: number;
  currentStreak: number;
  hoursSinceLastSession: number;
  dominantEmotionTags: string[];
  userLanguageTags: string[];
  typicalUsagePattern: { dayOfWeek: number; hourOfDay: number } | null;
  lastSessionMood: "lighter" | "same" | "heavier" | "unsure" | null;
  lastMirrorConfirmation: "confirmed" | "refined" | "gave_up" | "abandoned" | null;
  /** Rendered semantic profile (Cognition Layer). Null pre-v1 / cold-start. */
  semanticProfile: string | null;
};

const REACH_VOICE: Record<NotificationReach, string> = {
  warm: "soft, recognition-forward, gently encouraging. The tone of a friend who notices without demanding.",
  direct: "honest and matter-of-fact. Pattern-aware. No softening. No false cheer. Gets to the point.",
  quiet: "minimal. Often just presence. Sometimes a single short sentence. Never explanatory.",
};

export function buildNotificationPrompt(ctx: NotificationContext): { system: string; user: string } {
  const reachDescription = REACH_VOICE[ctx.reach];

  const hasLanguageTags = ctx.userLanguageTags.length > 0;
  const hasEmotionTags = ctx.dominantEmotionTags.length > 0;

  const languageTagLine = hasLanguageTags
    ? `Words this user uses: ${ctx.userLanguageTags.slice(0, 3).join(", ")}`
    : "";

  const emotionTagLine = hasEmotionTags
    ? `Patterns they carry: ${ctx.dominantEmotionTags.slice(0, 3).join(", ")}`
    : "";

  const moodLine = ctx.lastSessionMood
    ? `Left their last session feeling: ${ctx.lastSessionMood}`
    : "";

  const confirmationLine = ctx.lastMirrorConfirmation
    ? `Last mirror: ${ctx.lastMirrorConfirmation}`
    : "";

  const patternLine = ctx.typicalUsagePattern
    ? `They typically process on day ${ctx.typicalUsagePattern.dayOfWeek} around hour ${ctx.typicalUsagePattern.hourOfDay}`
    : "";

  const recencySignal = [
    `Sessions completed: ${ctx.sessionCount}`,
    `Current streak: ${ctx.currentStreak} days`,
    `Hours since last session: ${Math.round(ctx.hoursSinceLastSession)}`,
    languageTagLine,
    emotionTagLine,
    moodLine,
    confirmationLine,
    patternLine,
  ]
    .filter(Boolean)
    .join("\n");

  const contextBlock = ctx.semanticProfile
    ? `Longitudinal profile:\n${ctx.semanticProfile}\n\nRecent signal (last few days):\n${recencySignal}`
    : recencySignal;

  const system = `You write one short notification line for Xolace, an emotional processing app.

The notification must pass this filter: "Could a close friend have texted this?"

Voice: ${reachDescription}

Hard rules:
- Maximum 90 characters
- No emoji
- Do not start with "Hey", "Hi", "Hello", or any greeting
- No exclamation points
- No clinical language ("self-care", "wellness", "mental health", "coping")
- No hollow positivity ("you got this", "hang in there", "stay strong")
- No questions unless absolutely natural to the voice
- If the user's own words (listed below) appear naturally, use them — their language, back to them
- Quiet reach = fewer words is better; a single line is ideal
- Output ONLY the notification text. Nothing else.`;

  const typeDescription =
    ctx.notificationType === "gentle_return"
      ? "gentle return (they haven't been by in a while)"
      : ctx.notificationType === "pattern_nudge"
        ? "pattern nudge (this is their usual processing time)"
        : "affirmation (a standalone line that does NOT reference the app, returning, 'space', 'door', or any invitation to come back - just something a friend might text)";

  const user = `Notification type: ${typeDescription}
Reach preset: ${ctx.reach}

Context:
${contextBlock}

Write one notification line.`;

  return { system, user };
}
