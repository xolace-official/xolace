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
/** Room around the pill for its blur. */
const BLEED = 80;
/** The tide reaches past both sides (board `.tide`: −40 each side, 60 below). */
const TIDE_OUT = 40;
const TIDE_BELOW = 60;

/** Board `.bglow` and `.tide`, evening and late; the colours are `reflect-*` tokens. */
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
	/** 0 → 1 → 0 over 4.8 s. */
	breath: SharedValue<number>;
	/** 0 lit … 1 dimmed to 5% (waiting, a heavy mirror). */
	dim: SharedValue<number>;
	/** The surge's lift in pt (0 … 80). */
	surge: SharedValue<number>;
	/** The tide's height above the bottom edge in pt (0 hidden). */
	tide: SharedValue<number>;
};

/**
 * Reflect's one ambient canvas (handoff §7): the Today card's edge light, moved to the bottom of
 * the screen (card-light's recipe: the blurred spectrum pill baked once, then the breath is an
 * image blit), the surge when the mirror lands (S7 `glowPose`), and the heavy path's warm tide
 * (S12 `paintTide`'s arched edge, on PathBuilder).
 */
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

	// closest-side: an ellipse touching the pill's sides, then blurred (σ 26).
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
	// The breath: .18 ↔ .26 (late .12 ↔ .18), scaleX .96 ↔ 1; dimmed it holds at 5%.
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
	// The surge: a second blit of the same light, peaking at .62 and stretched 25% as it lifts.
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
		// The edge is an arc through the crest: the curve's middle is half way to its control point.
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
