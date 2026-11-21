import { useEffect, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import {
	useAnimatedReaction,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playAffirmativePress, tap } from "@/lib/haptics";
import { useClock, useLive } from "@/lib/motion/clock";
import { KMOTION } from "../kindling-motion";
import { type Alarm, dueAt, NEVER, nextOf, withoutLeg } from "./alarms";
import { arrivalOf, type Burn, END, lifeOf, planBurn, planCatch } from "./burn";
import { EMBERS_S } from "./burn-art";
import type { Trail } from "./trail-geometry";

const NO_LEG = -1;
const DROP_S = 0.1;
const LIFT = { ms: 700, rise: 0.4, spring: 0.6, to: 1.06 } as const;
const MARCH_FPS = 30;

type Args = {
	trail: Trail;
	live: boolean;
	reduced: boolean;
	waiting: boolean;
};

export function useTend({ trail, live, reduced, waiting }: Args) {
	const burns = useSharedValue<Burn[]>([]);
	const listRef = useRef<Burn[]>([]);
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
	const fxTime = useSharedValue(0);
	const motion = live && !reduced;
	const front = useLive(false);
	const frontRef = useRef(front);
	useEffect(() => {
		frontRef.current = front;
	});
	const feel = (play: () => void) => {
		if (frontRef.current) {
			play();
		}
	};

	const alarms = useRef<Alarm[]>([]);
	const nextAt = useSharedValue(NEVER);
	const setAlarms = (list: Alarm[]) => {
		alarms.current = list;
		nextAt.set(nextOf(list));
	};
	const at = (alarm: Alarm) => setAlarms([...alarms.current, alarm]);
	const ring = (t: number) => {
		const { due, rest } = dueAt(alarms.current, t);
		setAlarms(rest);
		for (const a of due) {
			a.ring();
		}
	};
	useAnimatedReaction(
		() => time.get(),
		(t) => {
			if (burns.get().length > 0 || embersAt.get() >= 0) {
				fxTime.set(t);
			}
			if (t >= nextAt.get()) {
				nextAt.set(NEVER);
				scheduleOnRN(ring, t);
			}
		}
	);
	const fades = useRef(new Map<number, ReturnType<typeof setTimeout>>());
	useEffect(
		() => () => {
			for (const id of fades.current.values()) {
				clearTimeout(id);
			}
		},
		[]
	);

	const setBurns = (list: Burn[]) => {
		listRef.current = list;
		burns.set(list);
		setFlying(list.length);
	};
	const push = (burn: Burn) => {
		setBurns([...listRef.current, burn]);
		at({
			at: burn.t0 + lifeOf(burn) + DROP_S,
			leg: burn.leg,
			ring: () => setBurns(listRef.current.filter((b) => b !== burn)),
		});
	};

	const catchFire = () => {
		feel(playAffirmativePress);
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
		const t = time.get();
		embersAt.set(t);
		setEmbering(true);
		at({
			at: t + EMBERS_S,
			ring: () => {
				embersAt.set(-1);
				setEmbering(false);
			},
		});
	};

	const tend = (i: number, toFire: boolean, onArrive: () => void) => {
		if (!motion) {
			fade.leg.set(i);
			fade.t.set(0);
			fade.t.set(
				withTiming(1, { duration: KMOTION.goldMs, ...PLAY_AS_CHOSEN })
			);
			fades.current.set(
				i,
				setTimeout(() => {
					fades.current.delete(i);
					if (toFire) {
						catchFire();
					}
					onArrive();
				}, KMOTION.goldMs)
			);
			return;
		}
		const burn = planBurn(trail, i, time.get(), toFire);
		push(burn);
		feel(tap);
		at({
			at: burn.t0 + arrivalOf(burn),
			leg: i,
			ring: () => {
				if (burn.end === END.catch) {
					catchFire();
				} else if (burn.end === END.stop) {
					feel(Presets.dewdrop);
				}
				onArrive();
			},
		});
	};

	const cancel = (i: number) => {
		setBurns(withoutLeg(listRef.current, i));
		setAlarms(withoutLeg(alarms.current, i));
		const fadeTimer = fades.current.get(i);
		if (fadeTimer !== undefined) {
			clearTimeout(fadeTimer);
			fades.current.delete(i);
		}
		if (fade.leg.get() === i) {
			fade.leg.set(NO_LEG);
			fade.t.set(1);
		}
	};

	const reset = () => {
		setBurns([]);
		setAlarms([]);
		for (const id of fades.current.values()) {
			clearTimeout(id);
		}
		fades.current.clear();
		fade.leg.set(NO_LEG);
		fade.t.set(1);
		embersAt.set(-1);
		setEmbering(false);
	};

	const catchInPlace = () => {
		if (motion) {
			push(planCatch(time.get()));
		}
		catchFire();
	};

	return {
		burns,
		cancel,
		catchInPlace,
		embersAt,
		fade,
		fxTime,
		lift,
		reset,
		tend,
		time,
	};
}

export type Tend = ReturnType<typeof useTend>;
