/**
 * Fit-to-fill: binary-searches the largest font size at which the text still
 * fits its box, so a short quote grows to fill the card and a long one shrinks.
 * Measures with the real `onTextLayout` lines, so it costs one extra render per
 * search step (~6) and settles.
 *
 * The caller must render the measured Text as an unclipped, absolutely
 * positioned twin remounted on `measureKey` — measuring the height-capped
 * visible Text settles at the ceiling with the text overflowing.
 */
import { useState } from "react";
import { PixelRatio } from "react-native";
import type { LayoutChangeEvent, TextLayoutEvent } from "react-native";

const MAX_STEPS = 8;

/** display type floor and ceiling for the poster body */
const MIN_SIZE = 13;
const MAX_SIZE = 56;

export function useFitFontSize(
  text: string,
  { min, max }: { min?: number; max?: number } = {},
) {
  const [lo0, hi0] = [min ?? MIN_SIZE, max ?? MAX_SIZE];
  const [boxHeight, setBoxHeight] = useState(0);
  const [search, setSearch] = useState({ lo: lo0, hi: hi0, size: hi0, steps: 0 });

  // restart the search whenever the text, the box it must fill, or the OS text
  // size changes — `fontScale` multiplies every candidate, so a stale search
  // settles on a size that no longer fits
  const fontScale = PixelRatio.getFontScale();
  const key = `${text}|${boxHeight}|${lo0}|${hi0}|${fontScale}`;
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setSearch({ lo: lo0, hi: hi0, size: hi0, steps: 0 });
  }

  const onBoxLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setBoxHeight((prev) => (prev === h ? prev : h));
  };

  const onTextLayout = (e: TextLayoutEvent) => {
    if (!boxHeight) return;
    const lines = e.nativeEvent.lines;
    if (!lines.length) return;
    const last = lines[lines.length - 1];
    const contentHeight = last.y + last.height;

    setSearch((s) => {
      if (s.hi - s.lo <= 1 || s.steps >= MAX_STEPS) return s;
      const fits = contentHeight <= boxHeight;
      const lo = fits ? s.size : s.lo;
      const hi = fits ? s.hi : s.size;
      const steps = s.steps + 1;
      if (hi - lo <= 1) return { lo, hi, size: lo, steps };
      return { lo, hi, size: Math.floor((lo + hi) / 2), steps };
    });
  };

  return {
    fontSize: search.size,
    settled: search.hi - search.lo <= 1 || search.steps >= MAX_STEPS,
    onBoxLayout,
    onTextLayout,
    // remount the Text on every candidate so onTextLayout actually re-fires
    measureKey: `${key}|${search.size}`,
    debug: `${boxHeight}/${search.steps}`,
  };
}
