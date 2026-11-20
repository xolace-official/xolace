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
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";

const CYCLE_MS = 24_000;
const TAU = Math.PI * 2;
const BLUR = 0.11;
const RIM = 1.5;

type Blob = {
	x: number;
	y: number;
	r: [number, number];
	beats: number;
	offset: number;
	tone: 0 | 1 | 2;
};

const BLOBS: Record<VoiceSlug, [Blob, Blob, Blob]> = {
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
	wren: [
		{ beats: 7, offset: 0, r: [0.14, 0.28], tone: 1, x: 0.4, y: 0.4 },
		{ beats: 8, offset: 0.35, r: [0.07, 0.14], tone: 0, x: 0.66, y: 0.64 },
		{ beats: 9, offset: 0.65, r: [0.05, 0.12], tone: 2, x: 0.68, y: 0.34 },
	],
};

function useOrbTones(voice: VoiceSlug): [string, string, string] {
	return [
		useTokenColor(`orb-${voice}-light`),
		useTokenColor(`orb-${voice}-mid`),
		useTokenColor(`orb-${voice}-deep`),
	];
}

function useBlobRadius(blob: Blob, size: number, phase: SharedValue<number>) {
	return useDerivedValue(() => {
		const w =
			0.5 + 0.5 * Math.sin((phase.get() * blob.beats + blob.offset) * TAU);
		const [lo, hi] = blob.r;
		return size * (lo + (hi - lo) * w);
	});
}

type Props = {
	voice: VoiceSlug;
	size: number;
	running: boolean;
};

export function VoiceOrb({ voice, size, running }: Props) {
	const phase = useSharedValue(0);
	const tones = useOrbTones(voice);
	const base = useTokenColor("orb-base");
	const rim = useTokenColor("orb-rim");
	const sheen = useTokenColor("orb-sheen");
	const sheenClear = useTokenColor("orb-sheen-clear");
	const blobs = BLOBS[voice];

	useEffect(() => {
		if (!running) {
			return;
		}
		const from = phase.get() % 1;
		phase.set(from);
		phase.set(
			withRepeat(
				withTiming(from + 1, {
					duration: CYCLE_MS,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				}),
				-1,
				false
			)
		);
		return () => cancelAnimation(phase);
	}, [running, phase]);

	const r0 = useBlobRadius(blobs[0], size, phase);
	const r1 = useBlobRadius(blobs[1], size, phase);
	const r2 = useBlobRadius(blobs[2], size, phase);
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
