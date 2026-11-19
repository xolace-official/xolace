import { useEffect, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import {
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { playAffirmativePress, tap } from "@/lib/haptics";
import { useClock } from "@/lib/motion/clock";
import { KMOTION } from "../kindling-motion";
import { arrivalOf, type Burn, END, lifeOf, planBurn, planCatch } from "./burn";
import { EMBERS_S } from "./burn-art";
import type { Trail } from "./trail-geometry";

const NO_LEG = -1;
/** Drop a finished burn a beat after its last particle. */
const DROP_MS = 100;
const S = 1000;
/** Flux lifts as the fire catches: 1 → 1.06 → 1 over 700 ms. */
const LIFT = { ms: 700, rise: 0.4, spring: 0.6, to: 1.06 } as const;
/**
 * While only the dashes march, the clock runs at 30 fps: the canvas and its blurred paths
 * needn't redraw at 120 Hz. A spark in flight or rising embers get every frame.
 */
const MARCH_FPS = 30;

type Args = {
	trail: Trail;
	/** The screen is in front, the app active, and Reduce Motion off. */
	live: boolean;
	reduced: boolean;
	/** Something still waits: the dashes march. */
	waiting: boolean;
};

/**
 * The trail's UI-thread state (handoff §4, §5): one clock, which runs only while the dashes march,
 * a spark burns or embers rise; the burns in flight; Reduce Motion's gold fade; Flux's lift as
 * the fire catches. JS only schedules; every frame is drawn from these values.
 */
export function useTend({ trail, live, reduced, waiting }: Args) {
	const burns = useSharedValue<Burn[]>([]);
	const list = useRef<Burn[]>([]);
	/** The trail clock when the embers began rising (−1: none). */
	const embersAt = useSharedValue(-1);
	const lift = useSharedValue(1);
	const fade = { leg: useSharedValue(NO_LEG), t: useSharedValue(1) };
	const [flying, setFlying] = useState(0);
	const [embering, setEmbering] = useState(false);
	const moving = flying > 0 || embering;
	const time = useClock(
		live && (waiting || moving),
		undefined,
		moving ? undefined : MARCH_FPS
	);
	const motion = live && !reduced;

	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const later = (ms: number, fn: () => void) => {
		timers.current.push(setTimeout(fn, ms));
	};
	useEffect(
		() => () => {
			for (const id of timers.current) {
				clearTimeout(id);
			}
		},
		[]
	);

	const push = (burn: Burn) => {
		list.current = [...list.current, burn];
		burns.set(list.current);
		setFlying((n) => n + 1);
		later(lifeOf(burn) * S + DROP_MS, () => {
			list.current = list.current.filter((b) => b !== burn);
			burns.set(list.current);
			setFlying((n) => n - 1);
		});
	};

	const catchFire = () => {
		playAffirmativePress();
		if (!motion) {
			return;
		}
		lift.set(
			withSequence(
				withTiming(LIFT.to, {
					duration: LIFT.ms * LIFT.rise,
					easing: KMOTION.lit,
					...PLAY_AS_CHOSEN,
				}),
				withSpring(1, {
					dampingRatio: LIFT.spring,
					duration: LIFT.ms * (1 - LIFT.rise),
					...PLAY_AS_CHOSEN,
				})
			)
		);
		embersAt.set(time.get());
		setEmbering(true);
		later(EMBERS_S * S, () => {
			embersAt.set(-1);
			setEmbering(false);
		});
	};

	/** Light stop i's leg (§4): the flare, the burn and the arrival; Reduce Motion fades the gold. */
	const tend = (i: number, toFire: boolean, onArrive: () => void) => {
		if (!motion) {
			fade.leg.set(i);
			fade.t.set(0);
			const ms = reduced ? REDUCED_FADE_MS : KMOTION.goldMs;
			fade.t.set(withTiming(1, { duration: ms, ...PLAY_AS_CHOSEN }));
			later(ms, () => {
				if (toFire) {
					catchFire();
				}
				onArrive();
			});
			return;
		}
		const burn = planBurn(trail, i, time.get(), toFire);
		push(burn);
		tap();
		later(arrivalOf(burn) * S, () => {
			if (burn.end === END.catch) {
				catchFire();
			} else if (burn.end === END.stop) {
				Presets.dewdrop();
			}
			onArrive();
		});
	};

	/** The last waiting twig was passed: the fire catches where it is, with no run (§5). */
	const catchInPlace = () => {
		if (motion) {
			push(planCatch(time.get()));
		}
		catchFire();
	};

	return { burns, catchInPlace, embersAt, fade, lift, tend, time };
}

export type Tend = ReturnType<typeof useTend>;
