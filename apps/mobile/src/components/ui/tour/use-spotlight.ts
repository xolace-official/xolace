import { useEffect, useState } from "react";

import {
	useAnimatedProps,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

import { cutoutPath, spotlightFor } from "@/components/ui/tour/geometry";
import {
	type Rect,
	SPRING,
	type TourShape,
	type TourStepEntry,
} from "@/components/ui/tour/types";

type Spot = Rect & { radius: number };

/** The hole in the dim. `spot` is the measured target rect (places the card); `hole` is null
 * for a step with `cutout` off. The path lives on the UI thread so travel is one spring. */
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
	// The measurement carries its step's order, so an unmeasured step reads as no spot
	// rather than the previous step's, without clearing state in an effect.
	const [measurement, setMeasurement] = useState<{
		order: number;
		spot: Spot;
	} | null>(null);
	const spot =
		measurement && measurement.order === active?.order
			? measurement.spot
			: null;

	// Measured when the step becomes current and again on window resize: a portrait
	// rect describes nothing after a rotation.
	useEffect(() => {
		const target = active?.target.current;
		if (!target) {
			return;
		}
		const order = active.order;

		let cancelled = false;
		// A frame late on purpose: a target just scrolled into view is measured where it lands.
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

	// `settled` distinguishes the first target, which appears in place, from later ones that slide.
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const width = useSharedValue(0);
	const height = useSharedValue(0);
	const cornerRadius = useSharedValue(0);
	const settled = useSharedValue(false);

	// A step with `cutout` off is still measured so the card has somewhere to go.
	const hole = active?.cutout === false ? null : spot;

	useEffect(() => {
		// A step with nothing to point at collapses the hole rather than leaving the last one open.
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
