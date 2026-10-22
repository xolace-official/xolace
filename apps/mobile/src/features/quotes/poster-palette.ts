/**
 * The two parts of the poster palette a `--poster-*` token cannot express:
 * expo-linear-gradient wants a colour array, and Skia's <Turbulence> wants a
 * number. Every flat colour lives in `global.css` under `@theme static`.
 *
 * Fixed on purpose — the poster is a printed object, so its palette does not
 * follow the active theme. See the fixed-palette convention in CLAUDE.md.
 */

/** yellow -> pink -> grey, the design's hue journey down the poster */
export const POSTER_GRADIENT = {
  stops: ['#F9F06B', '#FBE3A0', '#FBD7DE', '#F7AFC4', '#CFC9C6', '#B9B7B4'] as [
    string,
    string,
    ...string[],
  ],
  locations: [0, 0.22, 0.46, 0.62, 0.82, 1] as [number, number, ...number[]],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

/**
 * Grain is not decoration: without it the pink -> grey transition visibly
 * bands on device (#294).
 */
export const POSTER_GRAIN_OPACITY = 0.09;

/**
 * The archive card tints, in the order the stack cycles them (#296). Names, not
 * values — the colours are `@theme static` tokens like the rest of the printed
 * palette; what a token cannot express is the *order*, which is what the item
 * index walks.
 */
export const ARCHIVE_TINT_VARS = [
  '--color-archive-tint-1',
  '--color-archive-tint-2',
  '--color-archive-tint-3',
  '--color-archive-tint-4',
] as const;
