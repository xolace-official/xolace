import {
  LOADER_NUMERIC_PROPERTIES,
  LOADER_COLOR_PROPERTIES,
  LOADER_NUMERIC_TRANSFORM_KEYS,
  LOADER_ANGLE_TRANSFORM_KEYS,
} from "./types";
import type { LoaderKeyframes } from "./types";

const NUMERIC_PROPERTIES = new Set<string>(LOADER_NUMERIC_PROPERTIES);
const COLOR_PROPERTIES = new Set<string>(LOADER_COLOR_PROPERTIES);
const NUMERIC_TRANSFORM_KEYS = new Set<string>(LOADER_NUMERIC_TRANSFORM_KEYS);
export const ANGLE_TRANSFORM_KEYS = new Set<string>(LOADER_ANGLE_TRANSFORM_KEYS);

const TRANSFORM_KEY_ORDER: string[] = [
  "perspective",
  "translateX",
  "translateY",
  "scaleX",
  "scaleY",
  "scale",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skewX",
  "skewY",
];

const TRANSFORM_DEFAULTS: Record<string, number> = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  perspective: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  skewX: 0,
  skewY: 0,
};

// ──────────────────────────────────────────
// Value parsing helpers
// ──────────────────────────────────────────

/**
 * Extracts the leading numeric value from a string (e.g. "45deg" → 45).
 * Returns 0 when the string contains no number.
 */
const parseAngleValue = (value: string | number): number => {
  if (typeof value === "number") return value;
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : 0;
};

/**
 * Reads the numeric value for a given transform key from a single
 * transform entry object. Angle keys are parsed from strings like "45deg".
 */
const extractTransformEntryValue = (
  entry: Record<string, unknown>,
  key: string,
): number | undefined => {
  if (!(key in entry)) return undefined;
  const raw = entry[key];
  if (ANGLE_TRANSFORM_KEYS.has(key)) return parseAngleValue(raw as string | number);
  return typeof raw === "number" ? raw : undefined;
};

// ──────────────────────────────────────────
// Parsed result type
// ──────────────────────────────────────────

/** Pre-computed interpolation config produced by parseKeyframes. */
export interface ParsedKeyframes {
  /** Normalized input range (0–1). */
  inputRange: number[];
  /** Numeric property → output range. */
  numericRanges: Record<string, number[]>;
  /** Color property → output range (string[]). */
  colorRanges: Record<string, string[]>;
  /** Transform key → output range. */
  transformRanges: Record<string, number[]>;
  /** Ordered list of transform keys present in keyframes. */
  transformOrder: string[];
}

// ──────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────

/**
 * Parses a LoaderKeyframes map into interpolation-ready ranges.
 * Keys 0-100 are auto-normalized to 0-1. Requires >= 2 keyframes.
 */
export const parseKeyframes = (keyframes: LoaderKeyframes): ParsedKeyframes => {
  const rawKeys = Object.keys(keyframes)
    .map(Number)
    .filter((k) => !Number.isNaN(k));

  if (rawKeys.length < 2) {
    throw new Error("Loader keyframes require at least 2 keyframe entries");
  }

  const sortedRawKeys = [...rawKeys].sort((a, b) => a - b);
  const maxKey = Math.max(...sortedRawKeys);
  const normalize = maxKey > 1 ? (k: number) => k / 100 : (k: number) => k;
  const inputRange = sortedRawKeys.map(normalize);

  const styles = sortedRawKeys.map((k) => (keyframes[k] ?? {}) as Record<string, unknown>);

  // Collect all property keys that appear across keyframes (except transform)
  const allKeys = new Set<string>();
  for (const s of styles) {
    for (const key of Object.keys(s)) {
      if (key !== "transform") allKeys.add(key);
    }
  }

  // Collect all transform keys used
  const transformKeysUsed = new Set<string>();
  for (const s of styles) {
    const transforms = s.transform as Record<string, unknown>[] | undefined;
    if (!transforms) continue;
    for (const entry of transforms) {
      const key = Object.keys(entry)[0];
      if (key && (NUMERIC_TRANSFORM_KEYS.has(key) || ANGLE_TRANSFORM_KEYS.has(key))) {
        transformKeysUsed.add(key);
      }
    }
  }

  // ── Numeric ranges ──
  const numericRanges: Record<string, number[]> = {};
  for (const key of allKeys) {
    if (!NUMERIC_PROPERTIES.has(key)) continue;
    const hasNumericValue = styles.some((s) => typeof s[key] === "number");
    if (!hasNumericValue) continue;

    const outputRange: number[] = [];
    let lastValue = 0;
    for (const s of styles) {
      const val = s[key];
      if (typeof val === "number") lastValue = val;
      outputRange.push(lastValue);
    }
    numericRanges[key] = outputRange;
  }

  // ── Color ranges ──
  const colorRanges: Record<string, string[]> = {};
  for (const key of allKeys) {
    if (!COLOR_PROPERTIES.has(key)) continue;
    const hasColorValue = styles.some((s) => typeof s[key] === "string");
    if (!hasColorValue) continue;

    const outputRange: string[] = [];
    let lastValue = "transparent";
    for (const s of styles) {
      const val = s[key];
      if (typeof val === "string") lastValue = val;
      outputRange.push(lastValue);
    }
    colorRanges[key] = outputRange;
  }

  // ── Transform ranges ──
  const transformOrder = TRANSFORM_KEY_ORDER.filter((k) => transformKeysUsed.has(k));
  const transformRanges: Record<string, number[]> = {};

  for (const transformKey of transformOrder) {
    const outputRange: number[] = [];
    let lastValue = TRANSFORM_DEFAULTS[transformKey] ?? 0;

    for (const s of styles) {
      const transforms = s.transform as Record<string, unknown>[] | undefined;
      let found = false;
      if (transforms) {
        for (const entry of transforms) {
          const val = extractTransformEntryValue(entry, transformKey);
          if (val !== undefined) {
            lastValue = val;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        // keep lastValue
      }
      outputRange.push(lastValue);
    }
    transformRanges[transformKey] = outputRange;
  }

  return {
    inputRange,
    numericRanges,
    colorRanges,
    transformRanges,
    transformOrder,
  };
};
