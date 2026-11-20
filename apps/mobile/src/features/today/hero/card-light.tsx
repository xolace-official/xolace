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
import { CardRim } from "./card-rim";
import { BLEED, useCardTextures } from "./card-textures";
import { CARD_TOKENS, HERO, LIGHT } from "./hero-model";

const SPECTRUM = ["peach", "rose", "lilac", "sky"] as const;

const EDGE_NARROW = 0.96;
const BREATH_MS = HERO.breathS * 1000;

type Props = {
	w: number;
	h: number;
	late: boolean;
	breathing: boolean;
	reduced: boolean;
	rim: SharedValue<number>;
	rimOpacity: SharedValue<number>;
	low: boolean;
};

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
	const [edgeLate1, edgeLate2, inner1, inner2, innerLate1, innerLate2, shadow] =
		useTokenColors(CARD_TOKENS);
	const edge = late ? LIGHT.edgeLate : LIGHT.edge;
	const edgeColors = late ? [edgeLate1, edgeLate2] : spectrum;
	const innerColors = late ? [innerLate1, innerLate2] : [inner1, inner2];
	const pillW = w - LIGHT.edgeInset * 2;
	const edgeW = pillW + BLEED * 2;
	const edgeH = LIGHT.edgeH + BLEED * 2;

	const { edgeTex, innerTex } = useCardTextures({
		edgeColors,
		edgeH,
		edgeW,
		h,
		innerColors,
		late,
		pillW,
		w,
	});

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
					color={shadow}
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
