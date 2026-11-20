import {
	BlurMask,
	Canvas,
	Group,
	Image,
	LinearGradient,
	Path,
	RadialGradient,
	Rect,
	Skia,
	useTexture,
	vec,
} from "@shopify/react-native-skia";
import { StyleSheet, useWindowDimensions } from "react-native";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { useTokenColors } from "@/lib/use-token-color";
import { LAYOUT } from "../layout";
import { TIDE, WRITE_IN } from "../motion";

const G = LAYOUT.glow;
const BLEED = 80;
const TIDE_OUT = 40;
const TIDE_BELOW = 60;

const GLOW = {
	evening: {
		high: 0.26,
		low: 0.18,
		positions: [0, 0.45, 1],
		tokens: ["reflect-glow-1", "reflect-glow-2", "reflect-glow-3"],
	},
	late: {
		high: 0.18,
		low: 0.12,
		positions: [0, 0.5, 1],
		tokens: [
			"reflect-glow-late-1",
			"reflect-glow-late-2",
			"reflect-glow-late-3",
		],
	},
} as const;
const TIDE_TOKENS = {
	evening: ["reflect-tide-1", "reflect-tide-2", "reflect-tide-3"],
	late: ["reflect-tide-late-1", "reflect-tide-late-2", "reflect-tide-late-3"],
} as const;
const TIDE_POSITIONS = [0, 0.6, 1];
const DIM_OPACITY = 0.05;
const SURGE_PEAK = 0.62;
const SURGE_STRETCH = 0.25;
const BREATH_NARROW = 0.96;
const TIDE_MIN = 0.5;

export type LightValues = {
	breath: SharedValue<number>;
	dim: SharedValue<number>;
	surge: SharedValue<number>;
	tide: SharedValue<number>;
};

export function AmbientLight({
	late,
	light,
}: {
	late: boolean;
	light: LightValues;
}) {
	const { width: W, height: H } = useWindowDimensions();
	const glow = late ? GLOW.late : GLOW.evening;
	const glowColors = useTokenColors(glow.tokens);
	const tideColors = useTokenColors(
		late ? TIDE_TOKENS.late : TIDE_TOKENS.evening
	);
	const pillW = W - G.side * 2;
	const texW = pillW + BLEED * 2;
	const texH = G.height + BLEED * 2;
	const centre = vec(BLEED + pillW / 2, BLEED + G.height / 2);

	const tex = useTexture(
		<Rect height={G.height} width={pillW} x={BLEED} y={BLEED}>
			<RadialGradient
				c={centre}
				colors={glowColors}
				origin={centre}
				positions={[...glow.positions]}
				r={pillW / 2}
				transform={[{ scaleY: G.height / pillW }]}
			/>
			<BlurMask blur={G.blur} style="normal" />
		</Rect>,
		{ height: texH, width: texW },
		[pillW, late, ...glowColors]
	);

	const { breath, dim, surge, tide } = light;
	const glowTop = H + G.below - G.height - BLEED;
	const opacity = useDerivedValue(() => {
		const lit = glow.low + (glow.high - glow.low) * breath.get();
		return lit + (DIM_OPACITY - lit) * dim.get();
	});
	const scaledW = useDerivedValue(
		() =>
			texW *
			(BREATH_NARROW + (1 - BREATH_NARROW) * breath.get() * (1 - dim.get()))
	);
	const x = useDerivedValue(() => W / 2 - scaledW.get() / 2);
	const y = useDerivedValue(() => glowTop - surge.get());
	const surgeOpacity = useDerivedValue(
		() => (SURGE_PEAK * surge.get()) / WRITE_IN.surge
	);
	const surgeH = useDerivedValue(
		() => texH * (1 + (SURGE_STRETCH * surge.get()) / WRITE_IN.surge)
	);
	const surgeY = useDerivedValue(
		() => H + G.below + BLEED - surgeH.get() - surge.get()
	);

	const tidePath = useDerivedValue(() => {
		const h = tide.get();
		const b = Skia.PathBuilder.Make();
		if (h <= TIDE_MIN) {
			return b.build();
		}
		const bottom = H + TIDE_BELOW;
		const crest = bottom - h;
		const fall = Math.min(TIDE.arch, h);
		b.moveTo(-TIDE_OUT, crest + fall);
		b.quadTo(W / 2, crest - fall, W + TIDE_OUT, crest + fall);
		b.lineTo(W + TIDE_OUT, bottom);
		b.lineTo(-TIDE_OUT, bottom);
		b.close();
		return b.build();
	});
	const tideStart = useDerivedValue(() => vec(0, H + TIDE_BELOW - tide.get()));
	const tideEnd = vec(0, H + TIDE_BELOW);

	return (
		<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Path path={tidePath}>
				<LinearGradient
					colors={tideColors}
					end={tideEnd}
					positions={TIDE_POSITIONS}
					start={tideStart}
				/>
			</Path>
			<Image
				fit="fill"
				height={texH}
				image={tex}
				opacity={opacity}
				width={scaledW}
				x={x}
				y={y}
			/>
			<Group opacity={surgeOpacity}>
				<Image
					fit="fill"
					height={surgeH}
					image={tex}
					width={scaledW}
					x={x}
					y={surgeY}
				/>
			</Group>
		</Canvas>
	);
}
