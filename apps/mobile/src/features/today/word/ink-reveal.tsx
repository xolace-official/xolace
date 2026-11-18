import { Canvas, RadialGradient, Rect, vec } from "@shopify/react-native-skia";
import { useEffect, useRef } from "react";
import {
	useDerivedValue,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE_INK } from "../today-motion";

/** The ink's leading edge: `radial-gradient(circle at 8% 50%, #000 r, transparent r + 16%)`, r 0 → 150%. */
const ORIGIN = { x: 0.08, y: 0.5 } as const;
const EDGE = 0.16;
const TO = 1.5;
const DELAY_MS = 450;
const MS = 2400;
/** Interpolate premultiplied, as CSS masks do: no grey band at the edge. */
const PREMUL = 1;

type Props = {
	w: number;
	h: number;
	cover: string;
	/** The cover has drawn: the line underneath can show. */
	onCovered: () => void;
	onDone: () => void;
};

/**
 * The line bleeds in once a day (ink-bleed-reveal, without its grain or wet
 * band). Cheaper than masking text: a Skia cover in the card's colour sits
 * over the line with a growing radial hole. It mounts for the reveal and
 * unmounts when it is done.
 */
export function InkReveal({ w, h, cover, onCovered, onDone }: Props) {
	const r = useSharedValue(0);
	// `circle` stops are shares of the distance to the farthest corner.
	const reach = Math.hypot(w * (1 - ORIGIN.x), h * ORIGIN.y);

	// Runs once per mount; a new onDone from a re-render must not restart the ink.
	const done = useRef(onDone);
	useEffect(() => {
		done.current = onDone;
	});
	// Two frames: the canvas has drawn its first frame over the line.
	const covered = useRef(onCovered);
	useEffect(() => {
		covered.current = onCovered;
	});
	useEffect(() => {
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => covered.current());
		});
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
		};
	}, []);

	useEffect(() => {
		const finish = () => done.current();
		r.set(
			withDelay(
				DELAY_MS,
				withTiming(
					TO,
					{ duration: MS, easing: EASE_INK, ...PLAY_AS_CHOSEN },
					(finished) => {
						if (finished) {
							scheduleOnRN(finish);
						}
					}
				),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [r]);

	const radius = useDerivedValue(() => Math.max(1, reach * (r.get() + EDGE)));
	const positions = useDerivedValue(() => [0, r.get() / (r.get() + EDGE), 1]);

	return (
		<Canvas
			pointerEvents="none"
			style={{ height: h, left: 0, position: "absolute", top: 0, width: w }}
		>
			<Rect height={h} width={w} x={0} y={0}>
				<RadialGradient
					c={vec(w * ORIGIN.x, h * ORIGIN.y)}
					colors={["rgba(0,0,0,0)", "rgba(0,0,0,0)", cover]}
					flags={PREMUL}
					positions={positions}
					r={radius}
				/>
			</Rect>
		</Canvas>
	);
}
