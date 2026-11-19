import { useEffect } from "react";
import { View } from "react-native";
import {
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useClock } from "@/lib/motion/clock";
import { type TrailTwig, type TwigState, tendedCount } from "../kindling-model";
import { FIRE_GLOW, KMOTION } from "../kindling-motion";
import type { KindlingColours } from "./kindling-colours";
import { KindlingFire } from "./kindling-fire";
import { KindlingRoad, type TendFade } from "./kindling-road";
import type { Trail } from "./trail-geometry";
import { TrailStop } from "./trail-stop";

/** The dashes march 16 pt (one dash and gap) every 530 ms. */
const MARCH = { periodMs: 530, step: 16 };

type Props = {
	trail: Trail;
	twigs: readonly TrailTwig[];
	shown: readonly TwigState[];
	open: number;
	caught: boolean;
	fade: TendFade;
	live: boolean;
	reduced: boolean;
	c: KindlingColours;
	onOpen: (i: number) => void;
};

/**
 * The road, the fire and the stops, laid out on the board's grid (§2). The fire's glow grows
 * with each tend and fills once it catches; the dashes march while anything waits.
 */
export function KindlingTrail({
	trail,
	twigs,
	shown,
	open,
	caught,
	fade,
	live,
	reduced,
	c,
	onOpen,
}: Props) {
	const n = tendedCount(shown);
	const fireGlow = useSharedValue(
		caught ? 1 : (FIRE_GLOW[Math.min(n, FIRE_GLOW.length - 1)] ?? 0)
	);
	useEffect(() => {
		const to = caught ? 1 : (FIRE_GLOW[Math.min(n, FIRE_GLOW.length - 1)] ?? 0);
		let duration: number = caught ? KMOTION.fireCatchMs : KMOTION.fireGlowMs;
		if (reduced) {
			duration = REDUCED_FADE_MS;
		}
		fireGlow.set(withTiming(to, { duration, ...PLAY_AS_CHOSEN }));
	}, [caught, fireGlow, n, reduced]);

	const t = useClock(live && shown.includes("wait"));
	const march = useDerivedValue(
		() => -((((t.get() * 1000) / MARCH.periodMs) % 1) * MARCH.step)
	);
	// A skip in its undo window keeps its place as the suggestion until it is sent (render 07).
	const suggestion = shown.findIndex((s) => s === "wait" || s === "undo");

	return (
		<View
			className="absolute top-0 left-0"
			style={{ height: trail.drawH, width: trail.width }}
		>
			<KindlingRoad
				c={c}
				fade={fade}
				fireGlow={fireGlow}
				lit={shown.map((s) => s === "done")}
				march={march}
				passed={shown.map((s) => s === "passed" || s === "undo")}
				trail={trail}
			/>
			<KindlingFire fire={trail.fire} reduced={reduced} />
			{twigs.map((twig, i) => {
				const [x, y] = trail.stops[i] ?? [0, 0];
				const state = shown[i] ?? "wait";
				return (
					<TrailStop
						c={c}
						dim={
							state === "wait" &&
							suggestion >= 0 &&
							i > suggestion &&
							i !== open
						}
						index={i}
						key={twig.id}
						live={live}
						onPress={onOpen}
						open={i === open}
						reduced={reduced}
						state={state}
						suggested={i === suggestion}
						total={twigs.length}
						twig={twig}
						x={x}
						y={y}
					/>
				);
			})}
		</View>
	);
}
