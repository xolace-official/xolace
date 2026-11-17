import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import type { PeersColors } from "../peers-colors";
import { EASE } from "../peers-ease";
import { CHIP, LAYOUT } from "../peers-look";

const L = LAYOUT.chip;
/** ember-charge's `beat()`: one lub-dub over 430 ms, 1 → 1.12 → 1 → 1.07 → 1. */
const BEAT = {
	dub: 0.07,
	lub: 0.12,
	steps: [90, 200, 270],
} as const;
/** The core fills from a third of its size (`.gly::after` .35 → 1). */
const CORE_FROM = 0.35;

function beat(ms: number): number {
	"worklet";
	const out = (x: number) => 1 - (1 - x) * (1 - x);
	const [a, b, c] = BEAT.steps;
	if (ms <= 0 || ms >= CHIP.beatMs) {
		return 1;
	}
	if (ms < a) {
		return 1 + BEAT.lub * out(ms / a);
	}
	if (ms < b) {
		return 1 + BEAT.lub - BEAT.lub * out((ms - a) / (b - a));
	}
	if (ms < c) {
		return 1 + BEAT.dub * out((ms - b) / (c - b));
	}
	return (
		1 + BEAT.dub - BEAT.dub * out(Math.min(1, (ms - c) / (CHIP.beatMs - c)))
	);
}

type Props = {
	on: boolean;
	/** Bumped on every turn-on, so the ember beats once per press. */
	presses: number;
	reduced: boolean;
	colors: PeersColors;
	/** The chip's light, 0 → 1: the warm ring follows it. */
	lit: SharedValue<number>;
};

/**
 * The chip's round ember (board `.gly`): a 1.6 pt ink-3 ring; lit, the ring
 * warms with its glow and the core fills (.35 → 1), then beats once 80 ms after
 * the press. No heart. Reduce Motion: a 200 ms cross-fade, no beat.
 */
export function EmberGlyph({ on, presses, reduced, colors, lit }: Props) {
	const [ring, glow] = colors.glyph;
	const [c0, c1, c2] = colors.ember;
	const core = useSharedValue(on ? 1 : 0);
	const beatMs = useSharedValue<number>(CHIP.beatMs);

	useEffect(() => {
		core.set(
			withTiming(on ? 1 : 0, {
				duration: reduced ? REDUCED_FADE_MS : CHIP.ms,
				...(reduced ? {} : { easing: EASE.pop }),
				...PLAY_AS_CHOSEN,
			})
		);
	}, [on, reduced, core]);
	useEffect(() => {
		if (!presses || reduced) {
			return;
		}
		beatMs.set(-CHIP.beatDelay);
		beatMs.set(
			withTiming(CHIP.beatMs, {
				duration: CHIP.beatMs + CHIP.beatDelay,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [presses, reduced, beatMs]);

	const warm = useAnimatedStyle(() => ({ opacity: clamp01(lit.get()) }));
	const glyph = useAnimatedStyle(() => ({
		transform: [{ scale: beat(beatMs.get()) }],
	}));
	const fill = useAnimatedStyle(() => ({
		opacity: clamp01(core.get() * (CHIP.ms / CHIP.coreMs)),
		transform: [
			{ scale: reduced ? 1 : CORE_FROM + (1 - CORE_FROM) * core.get() },
		],
	}));
	return (
		<Animated.View style={[{ height: L.glyph, width: L.glyph }, glyph]}>
			<View
				className="absolute inset-0 border-subtle"
				style={{ borderRadius: L.glyph / 2, borderWidth: L.ring }}
			/>
			<Animated.View
				className="absolute inset-0"
				style={[
					{
						borderColor: ring,
						borderRadius: L.glyph / 2,
						borderWidth: L.ring,
						boxShadow: `0 0 10px 2px ${glow}`,
					},
					warm,
				]}
			/>
			<Animated.View
				className="absolute"
				style={[
					{
						borderRadius: L.glyph / 2,
						experimental_backgroundImage: `radial-gradient(circle at 38% 34%, ${c0}, ${c1} 48%, ${c2})`,
						inset: L.coreInset,
					},
					fill,
				]}
			/>
		</Animated.View>
	);
}
