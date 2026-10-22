const EMOTION_EMOJI: Record<string, string> = {
  anger: '😤',
  sadness: '😢',
  anxiety: '😰',
  joy: '😊',
  fear: '😨',
  disgust: '🤢',
  surprise: '😲',
  calm: '🟢',
  frustration: '😔',
  grief: '🥀',
  loneliness: '🫥',
  shame: '😶',
  hope: '🌱',
  relief: '😮‍💨',
  confusion: '🌀',
  numbness: '🧊',
  guilt: '😞',
  overwhelm: '🌊',
  contentment: '☀️',
  love: '💛',
  paralysis: '⏸️',
  inadequacy: '🪨',
  'emotional flatness': '🫥',
  'emotional exhaustion': '🔋',
  disconnection: '🔌',
  heartbreak: '💔',
  ambivalence: '⚖️',
  flatness: '➖',
  rage: '🔥',
  'emotional shutdown': '🛑',
  'self-directed shame': '🪞',
  restlessness: '⚡',
  disorientation: '🌪️',
  resentment: '💢',
  stress: '😬',
  exhaustion: '🪫',
  demotivation: '🛋️',
  'self-doubt': '🫣',
  embarrassment: '😳',
  regret: '🍂',
  uncertainty: '❓',
  homesickness: '🏠',
  'not-belonging': '🚪',
  disappointment: '🥺',
  hopelessness: '🕳️',
  gratitude: '🙏',
  pride: '🌟',
};

/**
 * Map an emotion name to its corresponding emoji.
 *
 * @param emotion - Emotion name to look up (case-insensitive); may be `null` to indicate no emotion
 * @returns The emoji for the provided emotion, or '💭' if `emotion` is null, falsy, or not found
 */
export function getEmotionEmoji(emotion: string | null): string {
  
  if (!emotion) return '💭';
  return EMOTION_EMOJI[emotion.toLowerCase()] ?? '💭';
}

/**
 * Produce a human-facing label for an emotion string.
 *
 * @param emotion - The emotion to label; may be `null` or empty to indicate no emotion.
 * @returns The emotion with hyphens as spaces and its first character capitalized, or `'Reflection'` if `emotion` is `null` or empty.
 */
export function getEmotionLabel(emotion: string | null): string {
  if (!emotion) return 'Reflection';
  const words = emotion.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const PATH_LABELS: Record<string, string> = {
  solo: 'Sat with this',
  peers: "You're not alone",
  exit: 'Just needed to say it',
};

/**
 * Map a chosen path key to its display label.
 *
 * @param pathChosen - The path key selected by the user; may be null or undefined
 * @returns The label for `pathChosen`, or `Reflected` if `pathChosen` is falsy or not recognized
 */
export function getPathLabel(pathChosen: string | null): string {
  if (!pathChosen) return 'Reflected';
  return PATH_LABELS[pathChosen] ?? 'Reflected';
}
