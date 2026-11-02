// A voice as a living orb, after the colours app's blurry-circle cards: three soft blobs
// drifting inside a dark glass circle, in the voice's own colours and layout. While its
// sample plays, the blobs swell with the voice.

import {
	Blur,
	Canvas,
	Circle,
	Group,
	RadialGradient,
	vec,
} from "@shopify/react-native-skia";
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { useEffect } from "react";
import { View } from "react-native";
import {
	cancelAnimation,
	Easing,
	type SharedValue,
	useDerivedValue,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

// One full turn; every blob breathes a whole number of times per turn, so the loop is seamless.
const CYCLE_MS = 24_000;
const TAU = Math.PI * 2;
const SWELL = 0.7;
const BLUR = 0.11; // of the orb
const RIM = 1.5;

/** Centre and smallest/largest radius as fractions of the orb; `beats` per turn; which of
 * the voice's three colours (light, mid, deep). */
type Blob = {
	x: number;
	y: number;
	r: [number, number];
	beats: number;
	offset: number;
	tone: 0 | 1 | 2;
};

const BLOBS: Record<VoiceSlug, [Blob, Blob, Blob]> = {
	// Low and gravelly: two big slow blobs, low.
	ash: [
		{ beats: 5, offset: 0, r: [0.2, 0.34], tone: 1, x: 0.42, y: 0.62 },
		{ beats: 6, offset: 0.4, r: [0.12, 0.22], tone: 2, x: 0.66, y: 0.42 },
		{ beats: 7, offset: 0.7, r: [0.05, 0.1], tone: 0, x: 0.3, y: 0.32 },
	],
	sage: [
		{ beats: 4, offset: 0, r: [0.18, 0.32], tone: 1, x: 0.4, y: 0.4 },
		{ beats: 5, offset: 0.3, r: [0.08, 0.16], tone: 0, x: 0.66, y: 0.66 },
		{ beats: 6, offset: 0.6, r: [0.06, 0.14], tone: 2, x: 0.3, y: 0.68 },
	],
	vesper: [
		{ beats: 5, offset: 0.2, r: [0.14, 0.3], tone: 1, x: 0.62, y: 0.62 },
		{ beats: 7, offset: 0.5, r: [0.04, 0.09], tone: 0, x: 0.3, y: 0.5 },
		{ beats: 6, offset: 0.8, r: [0.07, 0.16], tone: 2, x: 0.56, y: 0.3 },
	],
	// Soft, with a lilt: quicker, smaller blobs.
	wren: [
		{ beats: 7, offset: 0, r: [0.14, 0.28], tone: 1, x: 0.4, y: 0.4 },
		{ beats: 8, offset: 0.35, r: [0.07, 0.14], tone: 0, x: 0.66, y: 0.64 },
		{ beats: 9, offset: 0.65, r: [0.05, 0.12], tone: 2, x: 0.68, y: 0.34 },
	],
};

/** The voice's light, mid and deep colours. */
export function useOrbTones(voice: VoiceSlug): [string, string, string] {
	return [
		useTokenColor(`orb-${voice}-light`),
		useTokenColor(`orb-${voice}-mid`),
		useTokenColor(`orb-${voice}-deep`),
	];
}

function useBlobRadius(
	blob: Blob,
	size: number,
	phase: SharedValue<number>,
	level: SharedValue<number>
) {
	return useDerivedValue(() => {
		const w =
			0.5 + 0.5 * Math.sin((phase.get() * blob.beats + blob.offset) * TAU);
		const [lo, hi] = blob.r;
		return size * (lo + (hi - lo) * w) * (1 + SWELL * level.get());
	});
}

type Props = {
	voice: VoiceSlug;
	size: number;
	/** The voice's live level, 0–1, while its sample plays. */
	level?: SharedValue<number>;
	/** `false` stops the turning, for an orb that is hidden. */
	running?: boolean;
};

export function VoiceOrb({ voice, size, level, running = true }: Props) {
	const reduced = useEffectiveReducedMotion();
	const phase = useSharedValue(0);
	const silent = useSharedValue(0);
	const swell = level ?? silent;
	const tones = useOrbTones(voice);
	const base = useTokenColor("orb-base");
	const rim = useTokenColor("orb-rim");
	const sheen = useTokenColor("orb-sheen");
	const sheenClear = useTokenColor("orb-sheen-clear");
	const blobs = BLOBS[voice];

	useEffect(() => {
		if (reduced || !running) {
			return;
		}
		// Carry on from where it stopped, so a hidden orb doesn't jump when it shows.
		const from = phase.get() % 1;
		phase.set(from);
		phase.set(
			withRepeat(
				withTiming(from + 1, { duration: CYCLE_MS, easing: Easing.linear }),
				-1,
				false
			)
		);
		return () => cancelAnimation(phase);
	}, [reduced, running, phase]);

	const r0 = useBlobRadius(blobs[0], size, phase, swell);
	const r1 = useBlobRadius(blobs[1], size, phase, swell);
	const r2 = useBlobRadius(blobs[2], size, phase, swell);
	const radii = [r0, r1, r2];
	const turn = useDerivedValue(() => [{ rotate: phase.get() * TAU }]);
	const c = size / 2;

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{
				backgroundColor: base,
				borderColor: rim,
				borderRadius: c,
				borderWidth: RIM,
				height: size,
				overflow: "hidden",
				width: size,
			}}
		>
			<Canvas style={{ flex: 1 }}>
				<Group origin={vec(c, c)} transform={turn}>
					{blobs.map((b, i) => (
						<Circle
							color={tones[b.tone]}
							cx={b.x * size}
							cy={b.y * size}
							key={`${voice}${b.tone}`}
							r={radii[i] ?? r0}
						>
							<Blur blur={size * BLUR} />
						</Circle>
					))}
				</Group>
				{/* A still sheen on top, so it reads as glass the blobs move behind. */}
				<Circle cx={c} cy={c} r={c}>
					<RadialGradient
						c={vec(size * 0.32, size * 0.26)}
						colors={[sheen, sheenClear]}
						r={c}
					/>
				</Circle>
			</Canvas>
		</View>
	);
}
