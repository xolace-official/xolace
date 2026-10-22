/**
 * Per-day streak messages shown beneath the calendar reveal.
 * Tone: honest acknowledgment, never cheerleader. Close to the fire,
 * not a push notification. Days without an entry show nothing —
 * the flip itself is the acknowledgment.
 */
const STREAK_COPY: Record<number, string> = {
  1: "You showed up. That's everything.",
  2: "Back again. It counts.",
  3: "Three days. Quietly building.",
  4: "Still here.",
  5: "Five days of telling the truth.",
  7: "A week. You made a week.",
  10: "Ten days. This is a practice now.",
  14: "Two weeks. It's becoming yours.",
  21: "Three weeks. The habit knows your name.",
  25: "Twenty-five. Still showing up.",
  30: "A month. You stayed.",
  40: "Forty days of not looking away.",
  50: "Fifty. Half a hundred honest moments.",
  60: "Two months. This is who you are now.",
  75: "Seventy-five. Most people never find out what this feels like.",
  90: "Ninety days. A season of staying.",
  100: "One hundred days. You kept coming back to yourself.",
};

/** Every 50 days past 100 gets an acknowledgment. */
const LONG_STREAK_INTERVAL = 50;

export function getStreakCopy(day: number): string | null {
  if (day <= 100) return STREAK_COPY[day] ?? null;
  if (day % LONG_STREAK_INTERVAL === 0) {
    return `${day} days. Still here. Still yours.`;
  }
  return null;
}
