import { useEffect } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { meterTotalMs } from "@/features/you/steadiness/parts/meter";
import { Row, type RowProps } from "@/features/you/steadiness/parts/part-row";
import { ViewFade } from "@/features/you/steadiness/parts/view-fade";
import type { PartView } from "@/features/you/steadiness/steadiness-model";
import { Surface } from "@/features/you/surface";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

type ListProps = RowProps & {
	parts: PartView[];
	active: boolean;
};
/** Production's list: a row and a tick meter per part. v2 opens a Xolace+ row in place. */
export function PartsList({ parts, active, ...row }: ListProps) {
	const reduced = useEffectiveReducedMotion();
	const total = meterTotalMs(parts.length);
	// One clock for every meter, restarted each time the list shows.
	const clock = useSharedValue(reduced ? total : 0);
	useEffect(() => {
		if (!active) {
			return;
		}
		if (reduced) {
			clock.set(total);
			return;
		}
		clock.set(0);
		clock.set(
			withTiming(total, {
				duration: total,
				easing: Easing.linear,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [clock, reduced, active, total]);
	return (
		<ViewFade active={active}>
			<Surface className="p-2">
				{parts.map((part, i) => (
					<Row {...row} clock={clock} index={i} key={part.domain} part={part} />
				))}
			</Surface>
		</ViewFade>
	);
}
