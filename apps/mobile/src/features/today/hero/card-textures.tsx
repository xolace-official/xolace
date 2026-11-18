import {
	BlurMask,
	Box,
	BoxShadow,
	Group,
	LinearGradient,
	RoundedRect,
	rect,
	rrect,
	useTexture,
	vec,
} from "@shopify/react-native-skia";
import { PixelRatio } from "react-native";
import { HERO, LIGHT } from "./hero-model";

/** Room around the card for the shadow's and the edge light's blur (σ 22). */
export const BLEED = 80;
const PR = PixelRatio.get();
const CLEAR = "rgba(0,0,0,0)";

type Sizes = {
	w: number;
	h: number;
	late: boolean;
	pillW: number;
	edgeW: number;
	edgeH: number;
	edgeColors: string[];
	/** The inner shadows' colours, in `LIGHT.inner`'s order. */
	innerColors: string[];
};

/**
 * The card's two blurred lights, drawn once into textures: the edge pill behind its lower
 * edge, and the inner light as stacked inner shadows rising from its floor (at the device's
 * pixel ratio). Rebuilt only when the card's size or the hour's light changes.
 */
export function useCardTextures({
	w,
	h,
	late,
	pillW,
	edgeW,
	edgeH,
	edgeColors,
	innerColors,
}: Sizes) {
	const edgeTex = useTexture(
		<RoundedRect
			height={LIGHT.edgeH}
			r={LIGHT.edgeH / 2}
			width={pillW}
			x={BLEED}
			y={BLEED}
		>
			<LinearGradient
				colors={edgeColors}
				end={vec(BLEED + pillW, 0)}
				start={vec(BLEED, 0)}
			/>
			<BlurMask blur={LIGHT.edgeBlur} style="normal" />
		</RoundedRect>,
		{ height: edgeH, width: edgeW },
		[pillW, late, edgeColors.join()]
	);
	const innerTex = useTexture(
		<Group transform={[{ scale: PR }]}>
			<Box
				box={rrect(rect(-1, -1, w + 2, h + 2), HERO.radius, HERO.radius)}
				color={CLEAR}
			>
				{LIGHT.inner.map((l, i) => (
					<BoxShadow
						blur={l.blur * h}
						color={innerColors[i]}
						dx={0}
						dy={-l.dy * h}
						inner
						key={l.dy}
					/>
				))}
			</Box>
		</Group>,
		{ height: Math.ceil(h * PR), width: Math.ceil(w * PR) },
		[w, h, late, innerColors.join()]
	);

	return { edgeTex, innerTex };
}
