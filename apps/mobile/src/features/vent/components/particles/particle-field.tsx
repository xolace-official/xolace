import { BlurStyle, Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  BASE_RADIUS,
  COMPRESS_MS,
  DIR_X,
  FLASH_COLOR,
  MAX_RADIUS,
  PHASE0,
  SCATTER_MS,
  SILENCE_MS,
  SIZE,
} from './particle-config';
import { drawBurn, drawField, drawSparse } from './particle-render';

export type ParticleStage = 'sparse' | 'enter' | 'recording' | 'burning' | 'done';

const PHASES: Record<ParticleStage, number> = {
  sparse: 0,
  enter: 1,
  recording: 2,
  burning: 3,
  done: 4,
};

type Props = {
  stage: ParticleStage;
  /** Normalized 0–1 mic level. Drives field radius + warmth while recording. */
  metering?: SharedValue<number>;
  /** Set > 0 by the pinch-spread gesture to skip the compression beat. */
  burnSkip?: SharedValue<number>;
  /** Fired once, ~1s after the scatter fully fades (the silence beat). */
  onBurnComplete?: () => void;
};

/**
 * Skia particle field for the vent ritual. All per-frame work happens on the
 * UI thread: a frame callback advances the clock and smooths metering into
 * radius/warmth, and a derived Picture re-records the scene each frame.
 */
export function ParticleField({ stage, metering, burnSkip, onBurnComplete }: Props) {
  const { width: w, height: h } = useWindowDimensions();

  const clock = useSharedValue(0);
  const phase = useSharedValue(-1);
  const pendingPhase = useSharedValue(PHASES[stage]);
  const phaseStart = useSharedValue(0);
  const enterStart = useSharedValue(-1);

  const smMeter = useSharedValue(0);
  const radius = useSharedValue(BASE_RADIUS);
  const warmth = useSharedValue(0);

  const radiusAtBurn = useSharedValue(BASE_RADIUS);
  const warmthAtBurn = useSharedValue(0);
  const skipAt = useSharedValue(-1);
  const burnNotified = useSharedValue(0);

  useEffect(() => {
    pendingPhase.set(PHASES[stage]);
  }, [stage, pendingPhase]);

  useFrameCallback((frame) => {
    'worklet';
    const ts = frame.timestamp ?? 0;
    clock.set(ts);

    const ph = phase.get();
    const next = pendingPhase.get();
    if (next !== ph) {
      if (next === PHASES.enter && enterStart.get() < 0) enterStart.set(ts);
      if (next === PHASES.burning) {
        // Snapshot the live field so compression starts from where it is.
        radiusAtBurn.set(radius.get());
        warmthAtBurn.set(warmth.get());
        skipAt.set(-1);
        burnNotified.set(0);
      }
      phase.set(next);
      phaseStart.set(ts);
      return;
    }

    // Smooth metering → radius/warmth targets. The radius naturally stops at
    // MAX_RADIUS — the soft duration ceiling from the design spec.
    const m = metering ? metering.get() : 0;
    smMeter.set(smMeter.get() + (m - smMeter.get()) * 0.12);
    const recording = ph === PHASES.recording;
    const targetR = recording
      ? BASE_RADIUS + smMeter.get() * (MAX_RADIUS - BASE_RADIUS)
      : BASE_RADIUS;
    radius.set(radius.get() + (targetR - radius.get()) * 0.06);
    const targetW = recording ? smMeter.get() : 0;
    warmth.set(warmth.get() + (targetW - warmth.get()) * 0.08);

    if (ph === PHASES.burning) {
      // Pinch-spread accelerant: they chose to release — honor it instantly.
      if (burnSkip && burnSkip.get() > 0 && skipAt.get() < 0) {
        const bt = ts - phaseStart.get();
        if (bt < COMPRESS_MS) skipAt.set(bt);
      }
      if (burnNotified.get() === 0) {
        const explodeStart = skipAt.get() >= 0 ? skipAt.get() : COMPRESS_MS;
        if (ts - phaseStart.get() > explodeStart + SCATTER_MS + SILENCE_MS) {
          burnNotified.set(1);
          if (onBurnComplete) scheduleOnRN(onBurnComplete);
        }
      }
    }
  });

  const picture = useDerivedValue(() => {
    'worklet';
    const ts = clock.get();
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, w, h));
    const paint = Skia.Paint();
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2.5, true));

    const ph = phase.get();
    if (ph === PHASES.sparse) {
      drawSparse(canvas, paint, ts, w, h);
    } else if (ph === PHASES.enter || ph === PHASES.recording) {
      const es = enterStart.get();
      drawField(canvas, paint, ts, es < 0 ? 0 : ts - es, radius.get(), warmth.get(), w, h);
    } else if (ph === PHASES.burning) {
      const explodeStart = skipAt.get() >= 0 ? skipAt.get() : COMPRESS_MS;
      const bt = ts - phaseStart.get();
      const burnEnd = explodeStart + SCATTER_MS + SILENCE_MS;
      if (bt <= burnEnd) {
        const flashPaint = Skia.Paint();
        flashPaint.setColor(Skia.Color(FLASH_COLOR));
        flashPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 26, true));
        drawBurn(
          canvas,
          paint,
          flashPaint,
          ts,
          bt,
          radiusAtBurn.get(),
          warmthAtBurn.get(),
          explodeStart,
          w,
          h,
        );
      } else {
        // Afterglow: the burn finished but the pipeline result hasn't arrived.
        // A handful of stray sparks keep rising off the spot where the paper
        // burned — flickering, drifting, dying out — so the wait reads as the
        // fire settling rather than a frozen screen.
        const wt = bt - burnEnd;
        const fadeIn = Math.min(wt / 800, 1);
        const cx = w / 2;
        const cy = h / 2;
        for (let i = 0; i < 9; i++) {
          const cycle = 2400 + PHASE0[i] * 350; // per-spark loop length
          const p = ((wt + PHASE0[i] * 900) % cycle) / cycle; // 0→1 lifetime
          const x = cx + DIR_X[i] * 30 + Math.sin(p * 6.283 + PHASE0[i]) * 12;
          const y = cy + 16 - p * 110; // born low, rises ~110px, dies
          const flicker = 0.55 + 0.45 * Math.sin(wt * 0.013 + PHASE0[i] * 7);
          // Lifetime envelope peaks mid-rise, fades at birth/death.
          const life = 4 * p * (1 - p);
          paint.setColor(Skia.Color(i % 3 === 0 ? '#E8A84C' : '#C4883F'));
          paint.setAlphaf(Math.min(fadeIn * life * flicker, 0.85));
          canvas.drawCircle(x, y, 1.4 + SIZE[i] * 0.5 * (1 - p * 0.5), paint);
        }
      }
    }
    // 'done' renders an empty picture — the dark screen.
    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
}
