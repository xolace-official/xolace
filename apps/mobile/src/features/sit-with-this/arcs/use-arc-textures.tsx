import {
	BlurMask,
	Group,
	LinearGradient,
	RoundedRect,
	useTexture,
	vec,
} from "@shopify/react-native-skia";
import { PixelRatio } from "react-native";
import { arcsAt } from "@/design/breath-arc";
import { LIGHT as L } from "../sit-look";
import type { SitColors } from "./sit-colors";
import { BLEED, SEAM_PAD } from "./use-arc-lights";

const PR = PixelRatio.get();

/**
 * The arcs' blurred lights, drawn once into textures as card-light does: the
 * edge pill, and the seam's three layers at their relative alphas. Per frame
 * they only move, stretch and fade (`use-arc-lights.ts`).
 */
export function useArcTextures(W: number, H: number, colors: SitColors) {
	// The textures are baked at the arcs' half-breath widths and stretched from there.
	const mid = arcsAt(W, H, 0.5, 0);
	const pillW = mid.bot.w - L.edge.inset * 2;
	const seamW = Math.min(mid.top.w, mid.bot.w) - L.seamInset;
	const seamH = SEAM_PAD * 2;
	const { seamStops } = colors;

	const edgeTex = useTexture(
		<RoundedRect
			height={L.edge.h}
			r={L.edge.h / 2}
			width={pillW}
			x={BLEED}
			y={BLEED}
		>
			<LinearGradient
				colors={colors.edge}
				end={vec(BLEED + pillW, 0)}
				start={vec(BLEED, 0)}
			/>
			<BlurMask blur={L.edge.blur} style="normal" />
		</RoundedRect>,
		{ height: L.edge.h + BLEED * 2, width: pillW + BLEED * 2 },
		[pillW, colors.edge.join()]
	);
	// cipher-seam's layers, laid along the gap: tapering at both ends, no flicker,
	// flare or sparks; the core at .6. Drawn at the screen's scale for the hairline.
	const seamTex = useTexture(
		<Group transform={[{ scale: PR }]}>
			{L.seam.map((s) => (
				<RoundedRect
					height={s.h}
					key={s.h}
					opacity={s.alpha}
					r={s.h / 2}
					width={seamW}
					x={SEAM_PAD}
					y={SEAM_PAD - s.h / 2}
				>
					<LinearGradient
						colors={s.core ? colors.core : colors.seam}
						end={vec(SEAM_PAD + seamW, 0)}
						positions={[...(s.core ? L.coreStops : seamStops)]}
						start={vec(SEAM_PAD, 0)}
					/>
					<BlurMask blur={s.blur} style="normal" />
				</RoundedRect>
			))}
		</Group>,
		{
			height: Math.ceil(seamH * PR),
			width: Math.ceil((seamW + SEAM_PAD * 2) * PR),
		},
		[seamW, colors.seam.join(), colors.core.join()]
	);

	return { edgeTex, seamH, seamTex };
}
