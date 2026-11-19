import { useEffect } from "react";
import {
	cancelAnimation,
	Easing,
	type EasingFunction,
	type EasingFunctionFactory,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { LETTER_MOTION } from "../letter-motion";
import { foldMoves, type LetterPhase } from "../letters-model";

const M = LETTER_MOTION;
const FOLD = Easing.bezier(...M.curves.fold);
const ARRIVE = Easing.bezier(...M.curves.arrive);
const IN_OUT = Easing.inOut(Easing.ease);
const SWAY = Easing.inOut(Easing.sin);
const SPARK_OUT = Easing.out(Easing.quad);
const QUARTERS = 4;
/** Reduced, the glow fades up this far while the check runs, and doesn't breathe. */
const REDUCED_GLOW = 0.9;
const NEVER = PLAY_AS_CHOSEN.reduceMotion;

const timing = (
	to: number,
	duration: number,
	easing: EasingFunction | EasingFunctionFactory = FOLD
) => withTiming(to, { duration, easing, ...PLAY_AS_CHOSEN });

/**
 * The write sheet's moves on Reanimated (handoff §5): the fold (bottom, then top 300 ms later),
 * the glow's ignite and drain, the rise with its sway and three sparks, and the unfold. The glow's
 * breathing is an Ease loop on top (`write-letter.tsx`), so nothing here repeats. Which parts
 * move into each phase is `foldMoves`; this plays them.
 */
export function useLetterFold(phase: LetterPhase, reduced: boolean) {
	const folded = phase === "edit" ? 0 : 1;
	const bottom = useSharedValue(folded);
	const top = useSharedValue(folded);
	const glow = useSharedValue(0);
	const shrink = useSharedValue(0);
	const climb = useSharedValue(0);
	const sway = useSharedValue(0);
	const fade = useSharedValue(1);
	const spark0 = useSharedValue(0);
	const spark1 = useSharedValue(0);
	const spark2 = useSharedValue(0);
	const sparks = [spark0, spark1, spark2];

	useEffect(() => {
		const all = [spark0, spark1, spark2];
		const reset = () => {
			for (const v of [shrink, climb, sway, ...all]) {
				v.set(0);
			}
			fade.set(1);
		};
		const moves = foldMoves(phase, reduced);
		if (moves.reset) {
			reset();
		}
		switch (moves.bands) {
			case "flat":
				bottom.set(0);
				top.set(0);
				break;
			case "fold":
				bottom.set(timing(1, M.fold.stepMs));
				top.set(withDelay(M.fold.stepMs, timing(1, M.fold.stepMs), NEVER));
				break;
			case "unfold":
				top.set(withDelay(M.back.topAtMs, timing(0, M.back.stepMs), NEVER));
				bottom.set(
					withDelay(M.back.bottomAtMs, timing(0, M.back.stepMs), NEVER)
				);
				break;
			default:
				break;
		}
		switch (moves.glow) {
			case "off":
				cancelAnimation(glow);
				glow.set(0);
				break;
			case "still":
				glow.set(timing(REDUCED_GLOW, M.reducedMs, IN_OUT));
				break;
			case "ignite": {
				const [a, b, c] = M.ignite;
				glow.set(
					withDelay(
						M.fold.stepMs * 2,
						withSequence(
							NEVER,
							timing(a.to, a.ms, ARRIVE),
							timing(b.to, b.ms, IN_OUT),
							timing(c.to, c.ms, IN_OUT)
						),
						NEVER
					)
				);
				break;
			}
			case "drain":
				cancelAnimation(glow);
				glow.set(timing(0, reduced ? M.reducedMs : M.send.glowDrainMs, IN_OUT));
				break;
			default:
				break;
		}
		if (!moves.rise) {
			return;
		}
		const s = M.send;
		shrink.set(timing(1, s.shrink.ms));
		climb.set(withDelay(s.rise.delayMs, timing(1, s.rise.ms), NEVER));
		const quarter = s.rise.ms / QUARTERS;
		sway.set(
			withDelay(
				s.rise.delayMs,
				withSequence(
					NEVER,
					timing(1, quarter, SWAY),
					timing(0, quarter, SWAY),
					timing(-1, quarter, SWAY),
					timing(0, quarter, SWAY)
				),
				NEVER
			)
		);
		const tail = s.rise.ms * s.rise.fadeTail;
		fade.set(
			withDelay(
				s.rise.delayMs + s.rise.ms - tail,
				timing(0, tail, IN_OUT),
				NEVER
			)
		);
		all.forEach((sp, i) => {
			sp.set(
				withDelay(
					s.sparks.atMs[i] ?? 0,
					timing(1, s.sparks.ms, SPARK_OUT),
					NEVER
				)
			);
		});
	}, [
		phase,
		reduced,
		bottom,
		top,
		glow,
		shrink,
		climb,
		sway,
		fade,
		spark0,
		spark1,
		spark2,
	]);

	return { bottom, climb, fade, glow, shrink, sparks, sway, top };
}
