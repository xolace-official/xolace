import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE } from "../peers-ease";
import { DRAW, LAYOUT, MOTION, T, TIMING, YOU } from "../peers-look";
import { MarkCanvas, type MarkProps } from "./mark-canvas";
import { YouStar } from "./you-star";

/** `ring`: r 9 → 3.4×, α .7 → 0 over 3.2 s, the second half a cycle behind. */
const RING = { from: 0.7, scale: 3.4, stroke: 1.2 } as const;
/** Reduce Motion: one still ring (handoff §4; board `.still`). */
const STILL_RING = { alpha: 0.32, scale: 2.1 } as const;
const FOREVER = -1;

type Props = Omit<MarkProps, "ox" | "oy" | "ld"> & {
	W: number;
	breath: SharedValue<number>;
};

/**
 * The band at the top of the scroll (board `.band`, `.cst`): the mark, centred
 * (x + (W − 390) / 2), your star over it, and for None yet the rings going out
 * from you. Loading, the tile's three circles breathe in turn, once the wait
 * passes 300 ms. Hidden from VoiceOver.
 */
export function MarkBand({ W, breath, ...mark }: Props) {
	const { none, loading, reduced, arrive } = mark;
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
					arrive={arrive}
					color={mark.colors.alone}
					reduced={reduced}
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
	arrive: SharedValue<number>;
};

function AloneRings(p: RingsProps) {
	if (p.reduced) {
		return <Ring {...p} delay={0} still />;
	}
	return (
		<>
			<Ring {...p} delay={0} />
			<Ring {...p} delay={TIMING.ring / 2} />
		</>
	);
}

function Ring({
	x,
	y,
	color,
	still = false,
	arrive,
	delay,
}: RingsProps & { still?: boolean; delay: number }) {
	const u = useSharedValue(0);
	useEffect(() => {
		if (still) {
			return;
		}
		u.set(
			withDelay(
				delay,
				withRepeat(
					withTiming(1, {
						duration: TIMING.ring,
						easing: EASE.ring,
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
		return () => cancelAnimation(u);
	}, [still, delay, u]);
	const style = useAnimatedStyle(() => {
		// The rings start when Done does (board: `.alone` from `ui`).
		const shown = arrive.get() >= T.first ? 1 : 0;
		if (still) {
			return {
				opacity: STILL_RING.alpha * shown,
				transform: [{ scale: STILL_RING.scale }],
			};
		}
		const k = u.get();
		return {
			opacity: k <= 0 ? 0 : RING.from * (1 - k) * shown,
			transform: [{ scale: 1 + (RING.scale - 1) * k }],
		};
	});
	const d = DRAW.ring * 2;
	return (
		<Animated.View
			className="absolute"
			style={[
				{
					borderColor: color,
					borderRadius: DRAW.ring,
					borderWidth: RING.stroke,
					height: d,
					left: x - DRAW.ring,
					top: y - DRAW.ring,
					width: d,
				},
				style,
			]}
		/>
	);
}
