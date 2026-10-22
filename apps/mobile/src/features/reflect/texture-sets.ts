export type TextureSetId = 'flat' | 'tender' | 'bright' | 'charged';

export const TEXTURE_SET_IDS: readonly TextureSetId[] = [
  'flat',
  'tender',
  'bright',
  'charged',
];

/**
 * How many words one answer can hold.
 *
 * Nobody is feeling eight things at once — past four it stops being an answer
 * and starts being a shopping list, and the card can't hold it either.
 */
export const MAX_TEXTURES = 4;

export const TEXTURE_SETS: Record<TextureSetId, readonly string[]> = {
  flat: ['heavy', 'tight', 'foggy', 'buzzing', 'empty', 'scattered', 'numb', 'raw'],
  tender: ['aching', 'hollow', 'longing', 'bereft', 'weeping inside', 'closing off', 'tender', 'heavy-hearted'],
  bright: ['warm', 'open', 'grateful', 'hopeful', 'full', 'glowing', 'clear', 'lifted'],
  charged: ['racing', 'bracing', 'on-edge', 'restless', 'wound up', 'grinding', 'spinning', 'pressed'],
};

export const TEXTURE_SET_LABELS: Record<TextureSetId, string> = {
  flat: 'Flat',
  tender: 'Tender',
  bright: 'Bright',
  charged: 'Charged',
};

/**
 * The four hue families, borrowed from the mirror tone badges.
 *
 * Every theme already defines these four (`--tone-poetic` violet,
 * `--tone-gentle` rose, `--tone-direct` blue, `--tone-witnessed` amber) and
 * they are tuned per theme for light and dark — so they are the app's hue
 * families, not the badge's private colours. Retuning one there retunes the
 * pills here, which is the intent.
 */
export type TextureHue = 'violet' | 'rose' | 'blue' | 'amber';

/**
 * Which words are kin.
 *
 * Colour groups words by what they actually feel like — weight, absence,
 * unclarity, exposure — so the grid reads as a handful of related moods rather
 * than eight equal options. Two or three to a family; a word keeps its family
 * wherever it appears (`aching` is the same ache in Tender and at 3am).
 */
const HUE_BY_WORD: Record<string, TextureHue> = {
  // flat — weight, unclarity, absence, exposure
  heavy: 'blue', tight: 'blue',
  foggy: 'violet', scattered: 'violet',
  empty: 'amber', numb: 'amber',
  buzzing: 'rose', raw: 'rose',

  // tender — hurt, yearning, loss, withdrawal
  aching: 'rose', 'heavy-hearted': 'rose',
  longing: 'amber', tender: 'amber',
  hollow: 'violet', bereft: 'violet',
  'weeping inside': 'blue', 'closing off': 'blue',

  // bright — warmth, fullness, lift, clarity
  warm: 'amber', glowing: 'amber',
  grateful: 'rose', full: 'rose',
  hopeful: 'violet', lifted: 'violet',
  clear: 'blue', open: 'blue',

  // charged — speed, edge, pressure, tension
  racing: 'rose', spinning: 'rose',
  'on-edge': 'amber', restless: 'amber',
  bracing: 'blue', pressed: 'blue',
  'wound up': 'violet', grinding: 'violet',

  // night — the 3am set runs cool; no amber here on purpose
  'wide awake': 'blue', "can't turn it off": 'blue',
  'replaying it': 'violet', spiraling: 'violet',
  'something happened': 'rose', 'too much': 'rose',
};

export const textureHue = (word: string): TextureHue =>
  HUE_BY_WORD[word] ?? 'violet';

/**
 * Pill skins per hue. Written out rather than composed, because Tailwind can
 * only see class names that appear literally in the source.
 */
export const TEXTURE_PILL: Record<
  TextureHue,
  { rest: string; selected: string; label: string; echo: string }
> = {
  violet: {
    rest: 'bg-tone-poetic/10 border-tone-poetic/25',
    selected: 'bg-tone-poetic/25 border-tone-poetic/55',
    label: 'text-tone-poetic-text',
    echo: 'bg-tone-poetic/18',
  },
  rose: {
    rest: 'bg-tone-gentle/10 border-tone-gentle/25',
    selected: 'bg-tone-gentle/25 border-tone-gentle/55',
    label: 'text-tone-gentle-text',
    echo: 'bg-tone-gentle/18',
  },
  blue: {
    rest: 'bg-tone-direct/10 border-tone-direct/25',
    selected: 'bg-tone-direct/25 border-tone-direct/55',
    label: 'text-tone-direct-text',
    echo: 'bg-tone-direct/18',
  },
  amber: {
    rest: 'bg-tone-witnessed/10 border-tone-witnessed/25',
    selected: 'bg-tone-witnessed/25 border-tone-witnessed/55',
    label: 'text-tone-witnessed-text',
    echo: 'bg-tone-witnessed/18',
  },
};

export function resolveTextureSetId(value: unknown): TextureSetId {
  if (typeof value === 'string' && TEXTURE_SET_IDS.includes(value as TextureSetId)) {
    return value as TextureSetId;
  }
  return 'flat';
}
