import {
	BlurMask,
	Canvas,
	Group,
	Image,
	RoundedRect,
	rect,
	rrect,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { useTokenColors } from "@/lib/use-token-color";
import { CARD_LIGHT } from "../today-palette";
import { CardRim } from "./card-rim";
import { BLEED, useCardTextures } from "./card-textures";
import { HERO, LIGHT } from "./hero-model";

/** The Flux spectrum: the edge light by day and the hold rim. */
const SPECTRUM = ["peach", "rose", "lilac", "sky"] as const;

/** The edge light's breath: its width .96 → 1 (scaleX about the card's centre). */
const EDGE_NARROW = 0.96;
const BREATH_MS = HERO.breathS * 1000;

type Props = {
	w: number;
	h: number;
	late: boolean;
	/** The light breathes (4.8 s): Today live and the card on screen. */
	breathing: boolean;
	reduced: boolean;
	/** Hold progress 0 → 1; the rim fills clockwise from 12 o'clock. */
	rim: SharedValue<number>;
	/** 1 while holding, .45 once the doors are open. */
	rimOpacity: SharedValue<number>;
	/** Quality gate failed: no blurred rim copy. */
	low: boolean;
};

/**
 * The card, lit from within: its shadow, the edge light behind its lower edge, the surface,
 * the inner light rising from its floor, the hairline and the hold rim, in that order.
 *
 * The surface and hairline are the only theme colours here, and they are plain views
 * (`bg-surface`, `border-separator`), not Skia. A Skia canvas shows the last picture it was
 * sent; a theme change made while Today sat frozen behind another tab could reach the card
 * without that picture being redrawn, leaving last theme's surface under this theme's text.
 * Views take the new colour from Uniwind like the rest of the page. The
 * blurred lights are drawn once into textures and each sits in its own canvas, drawn once;
 * the breath is the opacity (and the edge's width) of the views around those two canvases,
 * a native loop (react-native-ease), so at rest nothing is redrawn. Only a hold draws the
 * rim live.
 */
export function CardLight({
	w,
	h,
	late,
	breathing,
	reduced,
	rim,
	rimOpacity,
	low,
}: Props) {
	const spectrum = useTokenColors(SPECTRUM);
	const edge = late ? LIGHT.edgeLate : LIGHT.edge;
	const edgeColors = late ? [...CARD_LIGHT.edgeLate] : spectrum;
	const pillW = w - LIGHT.edgeInset * 2;
	const edgeW = pillW + BLEED * 2;
	const edgeH = LIGHT.edgeH + BLEED * 2;

	const { edgeTex, innerTex } = useCardTextures({
		edgeColors,
		edgeH,
		edgeW,
		h,
		late,
		pillW,
		w,
	});

	// Stopping (off screen, Reflect in front) eases the light back to rest; starting again remounts.
	const run = useLoopRun(breathing && !reduced);
	const edgeBreath = loopOrSettle({
		from: { opacity: edge.low, scaleX: EDGE_NARROW },
		periodMs: BREATH_MS,
		reduced,
		running: breathing,
		to: { opacity: edge.high, scaleX: 1 },
	});
	const innerBreath = loopOrSettle({
		from: { opacity: edge.low },
		periodMs: BREATH_MS,
		reduced,
		running: breathing,
		to: { opacity: edge.high },
	});

	const s = HERO.shadow;
	return (
		<>
			{/* The card's own shadow. */}
			<Canvas
				pointerEvents="none"
				style={{
					height: h + BLEED * 2,
					left: -BLEED,
					position: "absolute",
					top: -BLEED,
					width: w + BLEED * 2,
				}}
			>
				<RoundedRect
					color={CARD_LIGHT.shadow}
					height={h + s.spread * 2}
					r={HERO.radius + s.spread}
					width={w + s.spread * 2}
					x={BLEED - s.spread}
					y={BLEED - s.spread + s.dy}
				>
					<BlurMask blur={s.blur} style="normal" />
				</RoundedRect>
			</Canvas>
			{/* The edge light, centred under the card's lower edge; its view breathes. */}
			<EaseView
				key={`edge-${run}`}
				pointerEvents="none"
				{...edgeBreath}
				style={{
					height: edgeH,
					left: w / 2 - edgeW / 2,
					position: "absolute",
					top: h - LIGHT.edgeH + LIGHT.edgeBelow - BLEED,
					width: edgeW,
				}}
			>
				<Canvas style={{ height: edgeH, width: edgeW }}>
					<Image
						fit="fill"
						height={edgeH}
						image={edgeTex}
						width={edgeW}
						x={0}
						y={0}
					/>
				</Canvas>
			</EaseView>
			{/* The surface. */}
			<View
				className="absolute inset-0 bg-surface"
				pointerEvents="none"
				style={{ borderRadius: HERO.radius }}
			/>
			{/* The inner light, clipped to the card; its view breathes. */}
			<EaseView
				key={`inner-${run}`}
				pointerEvents="none"
				{...innerBreath}
				style={{ height: h, left: 0, position: "absolute", top: 0, width: w }}
			>
				<Canvas style={{ height: h, width: w }}>
					<Group clip={rrect(rect(0, 0, w, h), HERO.radius, HERO.radius)}>
						<Image
							fit="fill"
							height={h}
							image={innerTex}
							width={w}
							x={0}
							y={0}
						/>
					</Group>
				</Canvas>
			</EaseView>
			{/* box-shadow: 0 0 0 1px line, a hairline just outside the edge. */}
			<View
				className="absolute border border-separator"
				pointerEvents="none"
				style={{
					borderRadius: HERO.radius + 1,
					bottom: -1,
					left: -1,
					right: -1,
					top: -1,
				}}
			/>
			<CardRim
				h={h}
				low={low}
				rim={rim}
				rimOpacity={rimOpacity}
				spectrum={spectrum}
				w={w}
			/>
		</>
	);
}
