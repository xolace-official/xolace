import {
	BlurMask,
	Canvas,
	Group,
	Image,
	LinearGradient,
	Path,
	RadialGradient,
} from "@shopify/react-native-skia";
import type { SitClock } from "../clock/use-sit-clock";
import { LIGHT as L } from "../sit-look";
import type { SitColors } from "./sit-colors";
import { BLEED, useArcLights } from "./use-arc-lights";
import { useArcTextures } from "./use-arc-textures";

type Props = {
	W: number;
	H: number;
	colors: SitColors;
	surface: string;
	line: string;
	clock: SitClock;
};

/**
 * Production's two arcs, lit like the Today card (handoff §4), in one canvas.
 * Drawing order: edge light → seam → top arc → top wash → bottom arc → floor
 * light → rim (blurred copy, then crisp). The blurred lights are drawn once
 * into textures (the edge pill, the seam's three layers at their relative
 * alphas) and per frame only move, stretch and fade; the arcs' paths come from
 * the clock.
 */
export function ArcsCanvas({ W, H, colors, surface, line, clock }: Props) {
	const { topPath, botPath, g } = clock;
	const { edgeTex, seamTex, seamH } = useArcTextures(W, H, colors);
	const {
		edgeX,
		edgeY,
		edgeW,
		edgeO,
		seamX,
		seamY,
		seamDrawW,
		washA,
		washB,
		floorA,
		floorB,
		rimC,
		rimR,
		rimO,
	} = useArcLights(clock, W, colors.edgeRange);

	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: H + BLEED * 2,
				left: -BLEED,
				position: "absolute",
				top: -BLEED,
				width: W + BLEED * 2,
			}}
		>
			<Group transform={[{ translateX: BLEED }, { translateY: BLEED }]}>
				<Image
					fit="fill"
					height={L.edge.h + BLEED * 2}
					image={edgeTex}
					opacity={edgeO}
					width={edgeW}
					x={edgeX}
					y={edgeY}
				/>
				<Image
					fit="fill"
					height={seamH}
					image={seamTex}
					opacity={g}
					width={seamDrawW}
					x={seamX}
					y={seamY}
				/>
				<Path color={surface} path={topPath} />
				<Path color={line} path={topPath} strokeWidth={1} style="stroke" />
				<Path path={topPath}>
					<LinearGradient colors={colors.wash} end={washB} start={washA} />
				</Path>
				<Path color={colors.bottom} path={botPath} />
				<Path color={line} path={botPath} strokeWidth={1} style="stroke" />
				<Path path={botPath}>
					<LinearGradient
						colors={colors.floor}
						end={floorB}
						positions={[0, L.reach.mid, 1]}
						start={floorA}
					/>
				</Path>
				<Group opacity={rimO}>
					{[topPath, botPath].map((path, i) => (
						<Path
							key={`soft-${i === 0 ? "top" : "bottom"}`}
							path={path}
							strokeWidth={L.rimBlurW}
							style="stroke"
						>
							<RadialGradient
								c={rimC}
								colors={colors.rim}
								positions={[...L.rimStops]}
								r={rimR}
							/>
							<BlurMask blur={L.rimBlur} style="normal" />
						</Path>
					))}
					{[topPath, botPath].map((path, i) => (
						<Path
							key={`crisp-${i === 0 ? "top" : "bottom"}`}
							path={path}
							strokeWidth={L.rimW}
							style="stroke"
						>
							<RadialGradient
								c={rimC}
								colors={colors.rim}
								positions={[...L.rimStops]}
								r={rimR}
							/>
						</Path>
					))}
				</Group>
			</Group>
		</Canvas>
	);
}
