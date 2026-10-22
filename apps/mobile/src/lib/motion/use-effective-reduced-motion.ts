import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccessibilityInfo } from "@/src/helpers/hooks/use-accessability-info";

/**
 * Tri-state motion preference. Mirrors the light/dark/system shape of `theme`.
 *   "system"  — follow the phone's reduce-motion setting (default)
 *   "reduced" — force reduced motion, ignore the OS
 *   "full"    — force full motion, ignore the OS
 */
export type MotionPreference = "system" | "reduced" | "full";

/**
 * Resolve the stored preference, falling back to the legacy boolean for rows
 * written before `motionPreference` shipped. Precedence keeps existing users
 * who had "reduced motion" on mapped to "reduced" (identical behavior); everyone
 * else becomes "system" (the correct, least-surprising default).
 */
export function resolveMotionPreference(
  motionPreference: MotionPreference | undefined,
  reducedMotion: boolean | undefined
): MotionPreference {
  return motionPreference ?? (reducedMotion ? "reduced" : "system");
}

/**
 * Fold the stored preference and the live OS flag into the single effective
 * boolean every motion consumer should read. "system" defers to the OS; the
 * forced values ignore it.
 */
export function isReducedMotion(
  preference: MotionPreference,
  osReduceMotionEnabled: boolean
): boolean {
  if (preference === "system") return osReduceMotionEnabled;
  return preference === "reduced";
}

/**
 * The one resolver every motion surface reads — never the raw preference.
 * Combines the stored tri-state with the live OS reduce-motion flag (which
 * updates mid-session via `reduceMotionChanged`), so a phone-level toggle takes
 * effect immediately without a restart.
 *
 * During cold load (preferences undefined) it resolves to full motion (false),
 * matching the OS default; callers that render motion gate on their own loading
 * state before this matters.
 */
export const useEffectiveReducedMotion = (): boolean => {
  const preferences = useQuery(api.preferences.get);
  const { reduceMotionEnabled } = useAccessibilityInfo();

  const preference = resolveMotionPreference(
    preferences?.motionPreference,
    preferences?.reducedMotion
  );

  return isReducedMotion(preference, reduceMotionEnabled);
};
