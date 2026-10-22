/**
 * Build a human-readable pattern summary from session context.
 * Fed into the LLM prompts as background context.
 */

interface RecentMetadataEntry {
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  thematicTags: string[];
  userLanguageTags: string[];
  temporalContext?: string;
}

interface RecentSessionEntry {
  state: string;
  entryType: string;
  timeOfDay?: string;
  pathChosen?: string;
  mirrorText?: string;
  createdAt: number;
}

interface ProfileSummary {
  sessionCount: number;
  currentStreak: number;
  dominantEmotionTags: string[];
  averageSessionDuration?: number;
  onboardingComplete: boolean;
}

interface PatternSummaryInput {
  profile: ProfileSummary;
  recentMetadata: RecentMetadataEntry[];
  recentSessions: RecentSessionEntry[];
  isFirstSession: boolean;
  mirrorTone: string;
}

/**
 * Builds a single-line human-readable summary of a user's profile, recent emotion patterns, recent path preferences, and mirror tone for inclusion in an LLM prompt.
 *
 * @param input - Object containing:
 *   - profile: user profile stats (`sessionCount`, `currentStreak`, `dominantEmotionTags`)
 *   - recentMetadata: recent emotion metadata entries (`primaryEmotion`, `intensity`, `thematicTags`)
 *   - recentSessions: recent session entries (may include `pathChosen` and `mirrorText`)
 *   - isFirstSession: when true returns a concise "first session" message instead of aggregated history
 *   - mirrorTone: the mirror tone string to append
 * @returns A single-line summary string describing sessions, dominant emotions, average intensity (out of 10), intensity trend when available, up to five themes, path preferences, and the mirror tone.
 */
export function buildPatternSummary(input: PatternSummaryInput): string {
  const { profile, recentMetadata, recentSessions, isFirstSession, mirrorTone } = input;

  if (isFirstSession) {
    return `First session. No history. Mirror tone: ${mirrorTone}.`;
  }

  const lines: string[] = [];

  // Profile stats
  lines.push(
    `Sessions: ${profile.sessionCount}. Streak: ${profile.currentStreak}.`
  );

  if (profile.dominantEmotionTags.length > 0) {
    lines.push(
      `Dominant emotions: ${profile.dominantEmotionTags.join(", ")}.`
    );
  }

  lines.push(...buildEmotionPatternLines(recentMetadata));

  // Path preferences
  if (recentSessions.length > 0) {
    const pathCounts = new Map<string, number>();
    for (const s of recentSessions) {
      if (s.pathChosen) {
        pathCounts.set(s.pathChosen, (pathCounts.get(s.pathChosen) ?? 0) + 1);
      }
    }
    if (pathCounts.size > 0) {
      const paths = [...pathCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([path, count]) => `${path} (${count}x)`)
        .join(", ");
      lines.push(`Path preferences: ${paths}.`);
    }
  }

  lines.push(`Mirror tone: ${mirrorTone}.`);

  return lines.join(" ");
}

/**
 * Slim variant for the ARTICULATOR prompt: only the signals that shape
 * how a mirror is written — recent emotions, average intensity, themes,
 * and the intensity trend. Session/streak counts, path preferences, and
 * mirror tone are omitted: they don't inform mirror-writing, and tone
 * already has its own dedicated section in the articulator prompt.
 * Longitudinal identity comes from the semantic profile block instead.
 */
export function buildArticulatorPatternSummary(
  input: Pick<PatternSummaryInput, "recentMetadata" | "isFirstSession">
): string {
  if (input.isFirstSession) {
    return "First session. No history.";
  }
  const lines = buildEmotionPatternLines(input.recentMetadata);
  return lines.length > 0 ? lines.join(" ") : "No recent emotional data.";
}

/** Emotion-pattern lines computed from recent metadata, shared by both variants. */
function buildEmotionPatternLines(
  recentMetadata: RecentMetadataEntry[]
): string[] {
  if (recentMetadata.length === 0) return [];

  const lines: string[] = [];
  const emotionCounts = new Map<string, number>();
  let totalIntensity = 0;
  const allThemes = new Set<string>();

  for (const m of recentMetadata) {
    emotionCounts.set(
      m.primaryEmotion,
      (emotionCounts.get(m.primaryEmotion) ?? 0) + 1
    );
    totalIntensity += m.intensity;
    for (const t of m.thematicTags) {
      allThemes.add(t);
    }
  }

  const sorted = [...emotionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, count]) => `${emotion} (${count}x)`)
    .join(", ");

  lines.push(`Recent emotions: ${sorted}.`);
  lines.push(
    `Avg intensity: ${(totalIntensity / recentMetadata.length).toFixed(1)}/10.`
  );

  if (allThemes.size > 0) {
    lines.push(`Themes: ${[...allThemes].slice(0, 5).join(", ")}.`);
  }

  // Intensity trend (non-overlapping windows)
  if (recentMetadata.length >= 4) {
    const windowSize = Math.floor(recentMetadata.length / 2);
    const recent = recentMetadata.slice(0, windowSize).map((m) => m.intensity);
    const older = recentMetadata.slice(-windowSize).map((m) => m.intensity);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const delta = recentAvg - olderAvg;

    if (delta > 1) {
      lines.push("Intensity trend: increasing.");
    } else if (delta < -1) {
      lines.push("Intensity trend: decreasing.");
    } else {
      lines.push("Intensity trend: stable.");
    }
  }

  return lines;
}

/**
 * Collect up to the first three non-empty mirror texts from recent sessions to reduce repetition.
 *
 * @param recentSessions - Array of session entries to extract mirrorText from; entries without `mirrorText` are ignored.
 * @returns An array of up to three mirror texts in the same order they appeared in `recentSessions`.
 */
export function collectRecentMirrors(
  recentSessions: RecentSessionEntry[]
): string[] {
  return recentSessions
    .filter((s) => s.mirrorText)
    .map((s) => s.mirrorText!)
    .slice(0, 3);
}
