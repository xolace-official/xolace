import { useEffect, useState } from "react";

import {
	useAnimatedProps,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

import { cutoutPath, spotlightFor } from "@/src/components/ui/tour/geometry";
import {
	type Rect,
	SPRING,
	type TourShape,
	type TourStepEntry,
} from "@/src/components/ui/tour/types";

type Spot = Rect & { radius: number };

/**
 * The hole in the dim: where it is, and the animated path that draws it.
 *
 * `spot` is where the target is, and places the card; `hole` is what gets cut,
 * and is null for a step with `cutout` off.
 *
 * Two halves that have to stay together. The rect is measured from the target
 * on the JS side; the path that cuts it out lives on the UI thread, so
 * travelling between two targets is one spring rather than a state update per
 * frame. Returning both keeps the overlay from having to know that.
 */
export function useSpotlight({
	active,
	shape,
	padding,
	radius,
	reducedMotion,
	screenWidth,
	screenHeight,
}: {
	active: TourStepEntry | undefined;
	shape: TourShape;
	padding: number;
	radius: number;
	reducedMotion: boolean;
	screenWidth: number;
	screenHeight: number;
}) {
	/*
	 * The measurement carries the order it was taken for, so a step whose target
	 * has not been measured yet reads as no spot rather than as the previous
	 * step's. Deriving that is what keeps the effect below from having to clear
	 * the state synchronously, which is a cascading render.
	 */
	const [measurement, setMeasurement] = useState<{
		order: number;
		spot: Spot;
	} | null>(null);
	const spot =
		measurement && measurement.order === active?.order
			? measurement.spot
			: null;

	/*
	 * Measured when the step becomes current and again whenever the window
	 * changes size. The second half is the part that is easy to leave out and
	 * impossible to miss once it is wrong: a rect taken in portrait describes
	 * nothing after a rotation, and the hole ends up over the wrong half of a
	 * screen the target is no longer on.
	 */
	useEffect(() => {
		const target = active?.target.current;
		if (!target) {
			return;
		}
		const order = active.order;

		let cancelled = false;
		// A frame late on purpose: a step whose target was just scrolled back into
		// view is measured where it lands, not where it was leaving.
		const frame = requestAnimationFrame(() => {
			target.measureInWindow((x, y, width, height) => {
				if (cancelled || (width === 0 && height === 0)) {
					return;
				}
				setMeasurement({
					order,
					spot: spotlightFor({ height, width, x, y }, shape, padding, radius),
				});
			});
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
		};
	}, [active, shape, padding, radius, screenWidth, screenHeight]);

	// `settled` distinguishes the first target — which appears where it belongs —
	// from every later one, which slides there.
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const width = useSharedValue(0);
	const height = useSharedValue(0);
	const cornerRadius = useSharedValue(0);
	const settled = useSharedValue(false);

	// A step with `cutout` off is measured, so the card has somewhere to go,
	// but cuts nothing.
	const hole = active?.cutout === false ? null : spot;

	useEffect(() => {
		// A step with nothing to point at collapses the hole rather than leaving
		// the last one open: the previous target is no longer what is being talked
		// about, and a hole over it says it is.
		if (!hole) {
			width.set(0);
			height.set(0);
			settled.set(false);
			return;
		}

		const animate = settled.get() && !reducedMotion;
		const to = (value: typeof x, next: number) => {
			value.set(animate ? withSpring(next, SPRING) : next);
		};

		to(x, hole.x);
		to(y, hole.y);
		to(width, hole.width);
		to(height, hole.height);
		to(cornerRadius, hole.radius);
		settled.set(true);
	}, [hole, reducedMotion, x, y, width, height, cornerRadius, settled]);

	const pathProps = useAnimatedProps(() => ({
		d: cutoutPath(
			screenWidth,
			screenHeight,
			x.get(),
			y.get(),
			width.get(),
			height.get(),
			cornerRadius.get()
		),
	}));

	return { hole, pathProps, spot };
}
