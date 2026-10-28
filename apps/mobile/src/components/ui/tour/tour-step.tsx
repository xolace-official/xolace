import { type ReactNode, useEffect, useMemo, useRef } from "react";
import type { ViewInstance } from "react-native";
import { View, type ViewProps } from "react-native";

import {
	type TourPlacement,
	type TourShape,
	type TourStepEntry,
	useTourContext,
} from "@/components/ui/tour/types";

export type TourStepProps = Omit<ViewProps, "children"> & {
	/** Position in the walkthrough: the author's numbering, unique per tour; a duplicate
	 * replaces the earlier. */
	order: number;
	/** The step's heading. */
	title?: string;
	/** The sentence under it. */
	description?: string;
	/** Drawn on the card beside the words, for a step the hole cannot show. */
	icon?: ReactNode;
	/** Cut a hole around the target. Default true. Off, the target only places the card. */
	cutout?: boolean;
	/** Shape of this step's cutout, overriding the tour's. */
	shape?: TourShape;
	/** Room around this target, overriding the tour's. */
	padding?: number;
	/** Corner radius of this cutout, overriding the tour's. */
	radius?: number;
	/** Which side of this target the card prefers, overriding the tour's. */
	placement?: TourPlacement;
	className?: string;
	/** The control this step is about. */
	children?: ReactNode;
};

/** Wraps the control a step is about and is what gets measured. A plain unsized view: put layout
 * classes on the step, not the child. Stays mounted while the tour is closed. */
export const TourStep = ({
	order,
	title,
	description,
	icon,
	cutout,
	shape,
	padding,
	radius,
	placement,
	className,
	children,
	...props
}: TourStepProps) => {
	const { register, unregister } = useTourContext("Tour.Step");
	const target = useRef<ViewInstance>(null);

	// Memoized: it is the identity the effect registers and unregisters on.
	const entry = useMemo<TourStepEntry>(
		() => ({
			cutout,
			description,
			icon,
			order,
			padding,
			placement,
			radius,
			shape,
			target,
			title,
		}),
		[order, title, description, icon, cutout, shape, padding, radius, placement]
	);

	useEffect(() => {
		register(entry);
		return () => unregister(entry);
	}, [entry, register, unregister]);

	return (
		<View className={className} collapsable={false} ref={target} {...props}>
			{children}
		</View>
	);
};

TourStep.displayName = "Tour.Step";
