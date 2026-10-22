import type { BreathPhase } from '@/src/lib/haptics'

// Fixed gap between the two shapes in pixels
export const GAP = 14

// Shape geometry — ratios of canvas dimensions
export const SHAPE = {
  top: {
    rest: { wRatio: 0.82, hRatio: 0.60, baseR: 54 },
    peak: { wRatio: 0.74, hRatio: 0.32, baseR: 40 },
  },
  bot: {
    rest: { wRatio: 0.74, hRatio: 0.20, baseR: 40 },
    peak: { wRatio: 0.86, hRatio: 0.54, baseR: 56 },
  },
} as const

// Per-corner radius multipliers.
// Outer corners (away from the gap) are large and organic.
// Inner corners (facing the gap) are dramatically tighter — like two stones pressing together.
// Left/right values differ slightly on each corner for the imperfect stone quality.
export const TOP_CORNERS = {
  topLeft:     { x: 1.02, y: 1.08 },  // outer — large
  topRight:    { x: 1.10, y: 0.98 },  // outer — large, slightly wide
  bottomRight: { x: 0.30, y: 0.26 },  // inner — very tight
  bottomLeft:  { x: 0.26, y: 0.32 },  // inner — very tight, slightly different
} as const

export const BOT_CORNERS = {
  topLeft:     { x: 0.28, y: 0.30 },  // inner — very tight
  topRight:    { x: 0.32, y: 0.26 },  // inner — very tight, slightly different
  bottomRight: { x: 1.08, y: 1.02 },  // outer — large
  bottomLeft:  { x: 0.98, y: 1.10 },  // outer — large, slightly tall
} as const

// Corner wobble during hold phase
export const WOBBLE_AMPLITUDE = 6
export const WOBBLE_DURATION_MS = 880

export const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: 'Breathe in',
  top: 'Hold',
  exhale: 'Breathe out',
}
