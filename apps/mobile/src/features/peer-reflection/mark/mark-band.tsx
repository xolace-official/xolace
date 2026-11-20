import { useEffect, useState } from "react";
import { View } from "react-native";
import {
	cancelAnimation,
	Easing,
	type SharedValue,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { type CubicBezier, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { DRAW, LAYOUT, MOTION, TIMING, YOU } from "../peers-look";
import { MarkCanvas, type MarkProps } from "./mark-canvas";
import { YouStar } from "./you-star";

const RING = { from: 0.7, scale: 3.4, stroke: 1.2 } as const;
const RING_EASE: CubicBezier = [0.2, 0.6, 0.3, 1];
const STILL_RING = { alpha: 0.32, scale: 2.1 } as const;
const FOREVER = -1;

type Props = Omit<MarkProps, "ox" | "oy" | "ld"> & {
	W: number;
	breath: SharedValue<number>;
	ui: boolean;
};

export function MarkBand({ W, breath, ui, ...mark }: Props) {
	const { none, loading, reduced } = mark;
	const H = none ? LAYOUT.band.noneHeight : LAYOUT.band.height;
	const ox = (W - LAYOUT.band.boardW) / 2;
	const oy = none ? LAYOUT.band.noneShift : 0;
	const ld = useSharedValue(0);

	useEffect(() => {
		if (!loading || reduced) {
			cancelAnimation(ld);
			ld.set(0);
			return;
		}
		ld.set(0);
		ld.set(
			withDelay(
				MOTION.loadingAfterMs,
				withRepeat(
					withTiming(TIMING.load, {
						duration: TIMING.load,
						easing: Easing.linear,
						...PLAY_AS_CHOSEN,
					}),
					FOREVER,
					false,
					undefined,
					PLAY_AS_CHOSEN.reduceMotion
				),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
		return () => cancelAnimation(ld);
	}, [loading, reduced, ld]);

	const at = { x: ox + YOU.x, y: oy + YOU.y };
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ height: H }}
		>
			<MarkCanvas {...mark} H={H} ld={ld} ox={ox} oy={oy} W={W} />
			{none ? (
				<AloneRings
					color={mark.colors.alone}
					reduced={reduced}
					ui={ui}
					{...at}
				/>
			) : null}
			<YouStar {...mark} breath={breath} ld={ld} ox={ox} oy={oy} />
		</View>
	);
}

type RingsProps = {
	x: number;
	y: number;
	color: string;
	reduced: boolean;
	ui: boolean;
};

function AloneRings({ ui, reduced, ...at }: RingsProps) {
	const [second, setSecond] = useState(false);
	useEffect(() => {
		if (!ui || reduced) {
			return;
		}
		const t = setTimeout(() => setSecond(true), TIMING.ring / 2);
		return () => clearTimeout(t);
	}, [ui, reduced]);
	if (!ui) {
		return null;
	}
	if (reduced) {
		return <Ring {...at} still />;
	}
	return (
		<>
			<Ring {...at} />
			{second ? <Ring {...at} /> : null}
		</>
	);
}

type RingProps = Omit<RingsProps, "ui" | "reduced"> & { still?: boolean };

function Ring({ x, y, color, still = false }: RingProps) {
	const d = DRAW.ring * 2;
	const place = {
		height: d,
		left: x - DRAW.ring,
		top: y - DRAW.ring,
		width: d,
	};
	// Ease can't animate a border colour: the ring is a plain bordered View inside.
	const ring = (
		<View
			style={{
				borderColor: color,
				borderRadius: DRAW.ring,
				borderWidth: RING.stroke,
				flex: 1,
			}}
		/>
	);
	if (still) {
		return (
			<View
				className="absolute"
				style={[
					place,
					{
						opacity: STILL_RING.alpha,
						transform: [{ scale: STILL_RING.scale }],
					},
				]}
			>
				{ring}
			</View>
		);
	}
	return (
		<EaseView
			className="absolute"
			style={place}
			{...loopProps({
				easing: RING_EASE,
				from: { opacity: RING.from, scale: 1 },
				mode: "repeat",
				periodMs: TIMING.ring,
				reduced: false,
				to: { opacity: 0, scale: RING.scale },
			})}
		>
			{ring}
		</EaseView>
	);
}
