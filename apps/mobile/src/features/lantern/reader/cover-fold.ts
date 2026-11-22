import { useWindowDimensions } from "react-native";
import {
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AX_FONT_SCALE } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export const FOLD = {
	band: 72,
	barRow: 52,
	coverShare: 0.52,
	drift: 0.5,
	shadeLead: 60,
	sheetOverlap: 28,
	titleFade: 0.7,
	titleFrom: -10,
	titleRise: 6,
	titleTo: 30,
} as const;

export type Fold = {
	barH: number;
	coverH: number;
	fold: number;
	imageStop: number;
	drift: number;
	ax: boolean;
	screenH: number;
	width: number;
};

export function useFold(): Fold {
	const insets = useSafeAreaInsets();
	const { height: screenH, width, fontScale } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const ax = fontScale >= AX_FONT_SCALE;
	const barH = insets.top + FOLD.barRow;
	const coverH = ax ? barH + FOLD.band : Math.round(screenH * FOLD.coverShare);
	return {
		ax,
		barH,
		coverH,
		drift: reduced ? 1 : FOLD.drift,
		fold: coverH - FOLD.sheetOverlap - barH,
		imageStop: (coverH - barH) / 2,
		screenH,
		width,
	};
}

export function useFoldStyles(
	y: SharedValue<number>,
	f: Fold,
	maxScroll: number
) {
	const reduced = useEffectiveReducedMotion();
	const { coverH, fold, imageStop, drift } = f;
	const photo = useAnimatedStyle(() => {
		const v = y.get();
		if (v < 0) {
			return reduced
				? { transform: [{ translateY: 0 }, { scale: 1 }] }
				: {
						transform: [{ translateY: 0 }, { scale: 1 - v / coverH }],
						transformOrigin: "top",
					};
		}
		return {
			transform: [
				{ translateY: -Math.min(v * drift, imageStop) },
				{ scale: 1 },
			],
		};
	});
	const largeTitle = useAnimatedStyle(() => ({
		opacity: interpolate(y.get(), [0, fold * FOLD.titleFade], [1, 0], "clamp"),
	}));
	const barShade = useAnimatedStyle(() => ({
		opacity: interpolate(
			y.get(),
			[fold - FOLD.shadeLead, fold],
			[0, 1],
			"clamp"
		),
	}));
	const barTitle = useAnimatedStyle(() => {
		const range = [fold + FOLD.titleFrom, fold + FOLD.titleTo];
		return {
			opacity: interpolate(y.get(), range, [0, 1], "clamp"),
			transform: [
				{
					translateY: reduced
						? 0
						: interpolate(y.get(), range, [FOLD.titleRise, 0], "clamp"),
				},
			],
		};
	});
	const readBar = useAnimatedStyle(() => ({
		opacity: y.get() > fold ? 1 : 0,
		transform: [
			{
				scaleX: Math.min(
					Math.max((y.get() - fold) / Math.max(maxScroll - fold, 1), 0),
					1
				),
			},
		],
	}));
	return { barShade, barTitle, largeTitle, photo, readBar };
}

export type FoldStyles = ReturnType<typeof useFoldStyles>;
