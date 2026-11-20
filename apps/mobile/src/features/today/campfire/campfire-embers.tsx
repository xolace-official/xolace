import { useState } from "react";
import {
	type CubicBezier,
	type EaseProps,
	EaseView,
	NONE,
	type TimingTransition,
} from "@/design/ease";
import { useTokenColors } from "@/lib/use-token-color";

const EMBERS: readonly (readonly [number, number, number, number, number])[] = [
	[37, 84, -5, 3.2, 0],
	[40, 86, 7, 3.8, -1.4],
	[38, 85, 1, 2.9, -2.2],
	[41, 84, -9, 4.1, -0.7],
	[39, 86, 11, 3.5, -3],
];
const RISE = 78;
const DOT = 3;

const FADE_IN_AT = 0.12;
const LOOP_IN: CubicBezier = [0.174, 1.457, 0, 0.896];
const LOOP_OUT: CubicBezier = [0.174, -0.001, 0, -0.122];

export function CampfireEmbers({
	running,
	low,
}: {
	running: boolean;
	low: boolean;
}) {
	const embers = low ? EMBERS.filter((_, i) => i % 2 === 0) : EMBERS;
	return (
		<>
			{embers.map((e) => (
				<Ember e={e} key={`${e[0]}-${e[1]}-${e[2]}`} running={running} />
			))}
		</>
	);
}

const linear = (ms: number, delay = 0): TimingTransition => ({
	duration: ms,
	easing: "linear",
	type: "timing",
	...(delay > 0 ? { delay } : {}),
});

function climb(dx: number, life: number) {
	return {
		scale: 1 - 0.6 * life,
		translateX: dx * life,
		translateY: -RISE * life,
	};
}

/**
 * Each ember starts `delay` into its life (a negative CSS delay), as it did on the shared clock.
 * Ease can't start a loop mid-cycle, so the first life plays out from there (exactly, all linear),
 * then the loop takes over from life 0.
 */
function Ember({
	e,
	running,
}: {
	e: (typeof EMBERS)[number];
	running: boolean;
}) {
	const [, , dx, periodS, delayS] = e;
	const [ember, emberGlow] = useTokenColors([
		"today-campfire-ember",
		"today-campfire-ember-glow",
	]);
	const period = periodS * 1000;
	const start = (((-delayS / periodS) % 1) + 1) % 1;
	const [run, setRun] = useState({ looping: start === 0, n: 0, was: running });
	if (run.was !== running) {
		setRun({
			looping: start === 0,
			n: run.n + (running ? 1 : 0),
			was: running,
		});
	}

	let outer: EaseProps;
	let inner: EaseProps;
	const top = climb(dx, 1);
	if (!running) {
		outer = { animate: { ...climb(dx, 0), opacity: 1 }, transition: NONE };
		inner = { animate: { opacity: 0 }, transition: NONE };
	} else if (run.looping) {
		outer = {
			animate: { ...top, opacity: 0 },
			initialAnimate: { ...climb(dx, 0), opacity: 1 },
			transition: {
				opacity: {
					duration: period,
					easing: LOOP_OUT,
					loop: "repeat",
					type: "timing",
				},
				transform: {
					duration: period,
					easing: "linear",
					loop: "repeat",
					type: "timing",
				},
			},
		};
		inner = {
			animate: { opacity: 1 },
			initialAnimate: { opacity: 0 },
			transition: {
				duration: period,
				easing: LOOP_IN,
				loop: "repeat",
				type: "timing",
			},
		};
	} else {
		const left = (1 - start) * period;
		const fading = start >= FADE_IN_AT;
		outer = {
			animate: { ...top, opacity: 0 },
			initialAnimate: {
				...climb(dx, start),
				opacity: fading ? (1 - start) / (1 - FADE_IN_AT) : 1,
			},
			transition: {
				opacity: fading
					? linear(left)
					: linear((1 - FADE_IN_AT) * period, (FADE_IN_AT - start) * period),
				transform: linear(left),
			},
		};
		inner = fading
			? { animate: { opacity: 1 }, transition: NONE }
			: {
					animate: { opacity: 1 },
					initialAnimate: { opacity: start / FADE_IN_AT },
					transition: linear((FADE_IN_AT - start) * period),
				};
	}
	const key = `${run.n}-${run.looping ? "loop" : "first"}`;
	return (
		<EaseView
			key={key}
			pointerEvents="none"
			{...outer}
			className="absolute"
			onTransitionEnd={({ finished }) => {
				if (finished && running && !run.looping) {
					setRun({ ...run, looping: true });
				}
			}}
			style={{ height: DOT, left: e[0], top: e[1], width: DOT }}
		>
			<EaseView
				{...inner}
				className="flex-1 rounded-full"
				style={{
					backgroundColor: ember,
					boxShadow: `0 0 6px 2px ${emberGlow}`,
				}}
			/>
		</EaseView>
	);
}
