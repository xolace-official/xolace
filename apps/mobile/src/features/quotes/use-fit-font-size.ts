// Binary-searches the largest font size at which the text fits its box, one
// render per step. The caller must measure an unclipped, absolutely positioned
// twin remounted on `measureKey`; the capped visible Text settles at the ceiling.
import { useState } from "react";
import type { LayoutChangeEvent, TextLayoutEvent } from "react-native";
import { PixelRatio } from "react-native";

const MAX_STEPS = 8;

const MIN_SIZE = 13;
const MAX_SIZE = 56;

export function useFitFontSize(
	text: string,
	{ min, max }: { min?: number; max?: number } = {}
) {
	const [lo0, hi0] = [min ?? MIN_SIZE, max ?? MAX_SIZE];
	const [boxHeight, setBoxHeight] = useState(0);
	const [search, setSearch] = useState({
		hi: hi0,
		lo: lo0,
		size: hi0,
		steps: 0,
	});

	// Restart on text, box or OS text size: `fontScale` multiplies every candidate.
	const fontScale = PixelRatio.getFontScale();
	const key = `${text}|${boxHeight}|${lo0}|${hi0}|${fontScale}`;
	const [prevKey, setPrevKey] = useState(key);
	if (prevKey !== key) {
		setPrevKey(key);
		setSearch({ hi: hi0, lo: lo0, size: hi0, steps: 0 });
	}

	const onBoxLayout = (e: LayoutChangeEvent) => {
		const h = Math.round(e.nativeEvent.layout.height);
		setBoxHeight((prev) => (prev === h ? prev : h));
	};

	const onTextLayout = (e: TextLayoutEvent) => {
		if (!boxHeight) {
			return;
		}
		const lines = e.nativeEvent.lines;
		if (!lines.length) {
			return;
		}
		const last = lines[lines.length - 1];
		const contentHeight = last.y + last.height;

		setSearch((s) => {
			if (s.hi - s.lo <= 1 || s.steps >= MAX_STEPS) {
				return s;
			}
			const fits = contentHeight <= boxHeight;
			const lo = fits ? s.size : s.lo;
			const hi = fits ? s.hi : s.size;
			const steps = s.steps + 1;
			if (hi - lo <= 1) {
				return { hi, lo, size: lo, steps };
			}
			return { hi, lo, size: Math.floor((lo + hi) / 2), steps };
		});
	};

	return {
		debug: `${boxHeight}/${search.steps}`,
		fontSize: search.size,
		// Remount the Text on every candidate so onTextLayout re-fires.
		measureKey: `${key}|${search.size}`,
		onBoxLayout,
		onTextLayout,
		settled: search.hi - search.lo <= 1 || search.steps >= MAX_STEPS,
	};
}
