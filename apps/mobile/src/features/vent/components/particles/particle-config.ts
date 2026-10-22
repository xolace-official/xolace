/**
 * Particle system data for the vent screen — all values precomputed once at
 * module load so the per-frame worklet only reads plain number arrays.
 *
 * Colors are fixed artwork constants from docs/vent-design.md (the ritual is
 * intentionally identical across themes), not theme tokens.
 */

export const PARTICLE_COUNT = 100;
export const SPARSE_COUNT = 26;

export const BASE_RADIUS = 120;
export const MAX_RADIUS = 220;
export const PERSPECTIVE = 600;

export const ASSEMBLY_MS = 2000;
export const PULSE_MS = 1200;
// Burn beats total ~4s: compress → flash → scatter → silence.
export const COMPRESS_MS = 600;
export const FLASH_MS = 140;
export const SCATTER_MS = 2200;
export const SILENCE_MS = 1200;

export const FLASH_COLOR = '#FFF3E0';

// Deterministic PRNG so the field looks the same every session.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260610);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Unit sphere directions (fibonacci lattice) — the orbital home of each particle.
export const DIR_X: number[] = [];
export const DIR_Y: number[] = [];
export const DIR_Z: number[] = [];
// Visual + motion seeds.
export const SIZE: number[] = []; // 2–4 px (design spec)
export const SPEED: number[] = []; // signed orbit speed multiplier
export const PHASE0: number[] = []; // per-particle phase offset
export const DELAY: number[] = []; // entry stagger, ms
export const ENTRY_X: number[] = []; // unit direction toward screen edge
export const ENTRY_Y: number[] = [];
// Scatter: per-particle velocity (px/ms) + gravity so the burst is non-uniform —
// some fly up, some drift sideways, some fall (design spec).
export const SCAT_VX: number[] = [];
export const SCAT_VY: number[] = [];
export const SCAT_G: number[] = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const t = (i + 0.5) / PARTICLE_COUNT;
  const phi = Math.acos(1 - 2 * t);
  const theta = GOLDEN_ANGLE * i;
  DIR_X.push(Math.sin(phi) * Math.cos(theta));
  DIR_Y.push(Math.cos(phi));
  DIR_Z.push(Math.sin(phi) * Math.sin(theta));

  SIZE.push(2 + rand() * 2);
  SPEED.push((0.5 + rand()) * (rand() > 0.5 ? 1 : -1));
  PHASE0.push(rand() * Math.PI * 2);
  DELAY.push(rand() * 600);

  const entryAngle = rand() * Math.PI * 2;
  ENTRY_X.push(Math.cos(entryAngle));
  ENTRY_Y.push(Math.sin(entryAngle));

  const scatAngle = rand() * Math.PI * 2;
  const scatSpeed = 0.15 + rand() * 0.35;
  SCAT_VX.push(Math.cos(scatAngle) * scatSpeed);
  // Slight upward bias so the burst reads as release, not collapse.
  SCAT_VY.push(Math.sin(scatAngle) * scatSpeed - 0.06);
  SCAT_G.push(0.0001 + rand() * 0.0004);
}

// Precomputed color ramp: ash gray → ember → amber. The render worklet indexes
// into this instead of interpolating colors per particle per frame.
export const RAMP_STEPS = 32;
export const RAMP_R: number[] = [];
export const RAMP_G: number[] = [];
export const RAMP_B: number[] = [];
// Normalized Float32 colors (RGBA 0–1) for each ramp step — eliminates
// Float32Array.of(...) allocations inside the per-particle setRampColor worklet.
export const RAMP_COLORS: Float32Array[] = [];

const STOPS = [
  [0x93, 0x99, 0xa8], // #9399A8 cool ash-gray
  [0xc4, 0x88, 0x3f], // #C4883F warming ember
  [0xe8, 0xa8, 0x4c], // #E8A84C hot amber
];

for (let i = 0; i < RAMP_STEPS; i++) {
  const p = (i / (RAMP_STEPS - 1)) * (STOPS.length - 1);
  const lo = Math.min(Math.floor(p), STOPS.length - 2);
  const f = p - lo;
  const r = STOPS[lo][0] + (STOPS[lo + 1][0] - STOPS[lo][0]) * f;
  const g = STOPS[lo][1] + (STOPS[lo + 1][1] - STOPS[lo][1]) * f;
  const b = STOPS[lo][2] + (STOPS[lo + 1][2] - STOPS[lo][2]) * f;
  RAMP_R.push(r);
  RAMP_G.push(g);
  RAMP_B.push(b);
  RAMP_COLORS.push(Float32Array.of(r / 255, g / 255, b / 255, 1));
}
