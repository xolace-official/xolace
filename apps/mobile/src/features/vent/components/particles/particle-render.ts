import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';
import {
  ASSEMBLY_MS,
  COMPRESS_MS,
  DELAY,
  DIR_X,
  DIR_Y,
  DIR_Z,
  ENTRY_X,
  ENTRY_Y,
  FLASH_MS,
  PARTICLE_COUNT,
  PERSPECTIVE,
  PHASE0,
  PULSE_MS,
  RAMP_COLORS,
  RAMP_STEPS,
  SCAT_G,
  SCAT_VX,
  SCAT_VY,
  SCATTER_MS,
  SIZE,
  SPARSE_COUNT,
  SPEED,
} from './particle-config';

function setRampColor(paint: SkPaint, warm: number, alpha: number) {
  'worklet';
  const idx = Math.round(Math.min(1, Math.max(0, warm)) * (RAMP_STEPS - 1));
  paint.setColor(RAMP_COLORS[idx]);
  paint.setAlphaf(Math.min(1, Math.max(0, alpha)));
}

/**
 * Orbit position of particle i at absolute time t (ms): unit sphere direction
 * rotated about Y per-particle, with a gentle vertical bob.
 */
function orbitPoint(i: number, t: number): { x: number; y: number; z: number } {
  'worklet';
  const rot = t * 0.0003 * SPEED[i] + PHASE0[i];
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  return {
    x: DIR_X[i] * cosR - DIR_Z[i] * sinR,
    y: DIR_Y[i] + Math.sin(t * 0.001 + PHASE0[i]) * 0.05,
    z: DIR_X[i] * sinR + DIR_Z[i] * cosR,
  };
}

/** Sparse, lazy backdrop for the intro screen — 20–30 dim ash particles. */
export function drawSparse(
  canvas: SkCanvas,
  paint: SkPaint,
  t: number,
  w: number,
  h: number,
) {
  'worklet';
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.42;
  for (let i = 0; i < SPARSE_COUNT; i++) {
    const pt = orbitPoint(i, t * 0.3);
    const scale = PERSPECTIVE / (PERSPECTIVE + pt.z * radius);
    setRampColor(paint, 0, 0.12 + 0.08 * ((1 - pt.z) / 2));
    canvas.drawCircle(cx + pt.x * radius * scale, cy + pt.y * radius * scale, SIZE[i] * scale, paint);
  }
}

/**
 * Main field: entry assembly (first ~2s after mount), settle pulse, then
 * continuous orbit. `radius` and `warmth` are pre-smoothed by the frame
 * callback — recording expansion and color warming fall out of them.
 */
export function drawField(
  canvas: SkCanvas,
  paint: SkPaint,
  t: number,
  enterT: number,
  radius: number,
  warmth: number,
  w: number,
  h: number,
) {
  'worklet';
  const cx = w / 2;
  const cy = h / 2;
  const entryDist = Math.max(w, h) * 0.7;

  // One settle pulse right after assembly: 1.0 → 1.08 → 1.0
  let pulse = 1;
  if (enterT > ASSEMBLY_MS && enterT < ASSEMBLY_MS + PULSE_MS) {
    pulse = 1 + 0.08 * Math.sin((Math.PI * (enterT - ASSEMBLY_MS)) / PULSE_MS);
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pt = orbitPoint(i, t);
    const r = radius * pulse;
    const scale = PERSPECTIVE / (PERSPECTIVE + pt.z * r);
    let x = cx + pt.x * r * scale;
    let y = cy + pt.y * r * scale;

    // Entry: drift in from the edges with cubic ease-out, staggered per particle.
    const rawP = (enterT - DELAY[i]) / ASSEMBLY_MS;
    const p = rawP <= 0 ? 0 : rawP >= 1 ? 1 : 1 - Math.pow(1 - rawP, 3);
    if (p < 1) {
      x = cx + ENTRY_X[i] * entryDist + (x - (cx + ENTRY_X[i] * entryDist)) * p;
      y = cy + ENTRY_Y[i] * entryDist + (y - (cy + ENTRY_Y[i] * entryDist)) * p;
    }

    const nearFactor = (1 - pt.z) / 2; // 0 far → 1 near
    // Warming spreads from the center of the field outward.
    const centerness = 1 - Math.min(1, Math.sqrt(pt.x * pt.x + pt.y * pt.y));
    const twinkle = 1 + 0.15 * Math.sin(t * 0.004 + PHASE0[i] * 7);

    setRampColor(paint, warmth * (0.35 + 1.25 * centerness), p * (0.3 + 0.7 * nearFactor));
    canvas.drawCircle(x, y, SIZE[i] * scale * twinkle, paint);
  }
}

/**
 * Burn sequence: compression → flash → non-uniform scatter → fade.
 * `explodeStart` is COMPRESS_MS normally, or earlier when the pinch-spread
 * accelerant fired. Returns nothing drawn after the scatter fully fades.
 */
export function drawBurn(
  canvas: SkCanvas,
  paint: SkPaint,
  flashPaint: SkPaint,
  t: number,
  burnT: number,
  radiusAtBurn: number,
  warmthAtBurn: number,
  explodeStart: number,
  w: number,
  h: number,
) {
  'worklet';
  const cx = w / 2;
  const cy = h / 2;

  if (burnT < explodeStart) {
    // Compression: weight gathers one last time. Ease-in toward the center.
    const raw = burnT / COMPRESS_MS;
    const p = raw * raw * raw;
    const r = radiusAtBurn * (1 - p) + 8 * p;
    const warm = warmthAtBurn + (1 - warmthAtBurn) * p;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pt = orbitPoint(i, t);
      const scale = PERSPECTIVE / (PERSPECTIVE + pt.z * r);
      const centerness = 1 - Math.min(1, Math.sqrt(pt.x * pt.x + pt.y * pt.y));
      setRampColor(paint, warm * (0.35 + 1.25 * centerness), 0.9);
      canvas.drawCircle(cx + pt.x * r * scale, cy + pt.y * r * scale, SIZE[i] * scale, paint);
    }
    return;
  }

  const te = burnT - explodeStart;

  // Flash: white-amber combustion spike at the center point.
  if (te < FLASH_MS) {
    flashPaint.setAlphaf(1 - te / FLASH_MS);
    canvas.drawCircle(cx, cy, 70 + te * 0.4, flashPaint);
  }

  if (te >= SCATTER_MS) return; // faded out — silence

  // Explosion from the compressed core, each particle on its own vector.
  const fade = 1 - te / SCATTER_MS;
  const tOrigin = explodeStart >= COMPRESS_MS ? t - te : t; // freeze origin orbit
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pt = orbitPoint(i, tOrigin);
    const x = cx + pt.x * 8 + SCAT_VX[i] * te;
    const y = cy + pt.y * 8 + SCAT_VY[i] * te + 0.5 * SCAT_G[i] * te * te;
    setRampColor(paint, 1, fade * 0.95);
    canvas.drawCircle(x, y, SIZE[i] * (1 - te / (SCATTER_MS * 2)), paint);
  }
}
