import { Canvas, Group, Path, rect, Skia } from "@shopify/react-native-skia";
import { useState } from "react";
import { View } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import type { PartView } from "@/features/you/steadiness/steadiness-model";
import { useTrack } from "@/features/you/steadiness/ticks";
import { useTokenColor } from "@/lib/use-token-color";

// Production's TickBar: 36 ticks 4 × 14, your usual's 22 tall in foreground.
const TICKS = 36;
const H = 22;
const TICK_W = 4;
const TICK_H = 14;
const RADIUS = 2;
/** Meters fill 30 ms apart, each tick 8 ms after the last, from 200 ms. */
const DELAY_MS = 200;
const STAGGER_MS = 30;
const TICK_MS = 8;
export const meterTotalMs = (rows: number) =>
	DELAY_MS + Math.max(0, rows - 1) * STAGGER_MS + TICKS * TICK_MS;

/** One part's meter: its inked ticks show one by one behind a clip on the list's one clock. */
export function Meter({
	part,
	color,
	clock,
	index,
}: {
	part: PartView;
	color: string;
	clock: SharedValue<number>;
	index: number;
}) {
	const fg = useTokenColor("foreground");
	const track = useTrack();
	const [w, setW] = useState(0);
	const inked =
		part.value === null ? 0 : Math.round((part.value / 100) * TICKS);
	const markAt =
		part.usual === null
			? -1
			: Math.max(0, Math.round((part.usual / 100) * TICKS) - 1);
	const step = (w - TICK_W) / (TICKS - 1);
	const paths = (() => {
		const off = Skia.PathBuilder.Make();
		const on = Skia.PathBuilder.Make();
		const mark = Skia.PathBuilder.Make();
		for (let k = 0; k < TICKS; k++) {
			const x = k * step;
			if (k === markAt) {
				mark.addRRect(
					Skia.RRectXY(Skia.XYWHRect(x, 0, TICK_W, H), RADIUS, RADIUS)
				);
				continue;
			}
			const r = Skia.RRectXY(
				Skia.XYWHRect(x, (H - TICK_H) / 2, TICK_W, TICK_H),
				RADIUS,
				RADIUS
			);
			off.addRRect(r);
			if (k < inked) {
				on.addRRect(r);
			}
		}
		return { mark: mark.build(), off: off.build(), on: on.build() };
	})();
	const delay = DELAY_MS + index * STAGGER_MS;
	const clip = useDerivedValue(() => {
		const shown = Math.min(
			inked,
			Math.max(0, Math.floor((clock.get() - delay) / TICK_MS))
		);
		return rect(0, 0, shown <= 0 ? 0 : (shown - 1) * step + TICK_W, H);
	});
	return (
		<View
			onLayout={(e) => setW(e.nativeEvent.layout.width)}
			style={{ height: H }}
		>
			{w > 0 ? (
				<Canvas style={{ height: H, width: w }}>
					<Path color={track} path={paths.off} />
					<Group clip={clip}>
						<Path color={color} path={paths.on} />
					</Group>
					<Path color={fg} path={paths.mark} />
				</Canvas>
			) : null}
		</View>
	);
}
