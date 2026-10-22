import { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  playCompassionateHold,
  playGentlePresence,
  playSoftenPulse,
} from '@/src/lib/haptics';
import { AppText } from '@/src/components/shared/app-text';

// This beat's own pulsing dot, not the BreathBeat orb (that one is imperative,
// driven by PacedOrb.playCycle with its own per-phase haptics). The dot below
// runs withRepeat(1400ms, reverse), so a full cycle is 2800ms — the haptic
// rides that same period to stay in phase with what the eye sees.
const PULSE_CYCLE_MS = 2800;

const INTENSITY_HAPTIC = {
  light: playGentlePresence,
  medium: playSoftenPulse,
  heavy: playCompassionateHold,
} as const;

type Props = {
  content: string;
  fallbackContent?: string;
  durationSeconds: number;
  /** Authored per-step in Convex. Defaults to `medium` (the previous fixed feel). */
  hapticIntensity?: 'light' | 'medium' | 'heavy';
  reducedMotion: boolean;
  onComplete: () => void;
};

export function HapticBeat({
  content,
  fallbackContent,
  durationSeconds,
  hapticIntensity = 'medium',
  reducedMotion,
  onComplete,
}: Props) {
  "use no memo";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useSharedValue(reducedMotion ? 1 : 0.5);

  useEffect(() => {
    const endsAt = Date.now() + durationSeconds * 1000;

    // Gate haptic on reducedMotion per plan §4.2 — dissociated states can be startled.
    if (!reducedMotion) {
      const playPulse = INTENSITY_HAPTIC[hapticIntensity];
      // This beat *is* the haptic. Firing once on mount left the dot pulsing
      // for the rest of the step with nothing under the finger — the one beat
      // whose whole point is touch went quiet first. Repeat on the dot's cycle
      // and stop with it.
      playPulse();
      // The cycle is the dot's, not the step's, so the last tick can land
      // moments before the beat ends — a buzz that reads as the *next* beat
      // starting. Drop any pulse with less than half a cycle left to breathe.
      pulseIntervalRef.current = setInterval(() => {
        if (endsAt - Date.now() < PULSE_CYCLE_MS / 2) return;
        playPulse();
      }, PULSE_CYCLE_MS);

      pulse.set(withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ));
    }

    // Stop buzzing the moment the beat is over, not whenever the parent gets
    // around to unmounting us — a transition animation would otherwise carry
    // the pulse into the next beat.
    timerRef.current = setTimeout(() => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
      onComplete();
    }, durationSeconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    };
    // Mount-once: haptic props are fixed for a beat's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.get() * 0.5,
    transform: [{ scale: 0.85 + pulse.get() * 0.3 }],
  }));

  // With no haptic or pulse, reduced-motion users need a text anchor so the
  // beat isn't silent + blank.
  const displayContent = content || (reducedMotion ? fallbackContent ?? '' : '');

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      className="items-center gap-8 px-8"
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={dotStyle}
        className="h-16 w-16 rounded-full bg-foreground/25"
      />
      {displayContent ? (
        <AppText className="text-center text-xl font-medium leading-relaxed text-foreground">
          {displayContent}
        </AppText>
      ) : null}
    </Animated.View>
  );
}
