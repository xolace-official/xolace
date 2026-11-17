import {
	BlurMask,
	Canvas,
	Group,
	Image,
	LinearGradient,
	RadialGradient,
	Rect,
	RoundedRect,
	rect,
	rrect,
	useTexture,
	vec,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { clearOf } from "@/design/clear-of";
import type { PeersColors } from "../peers-colors";
import { CARD_LIGHT } from "../peers-look";

const I = CARD_LIGHT.inner;
const E = CARD_LIGHT.edge;
/** Room around the edge pill for its blur (σ 22, about 3σ). */
const BLEED = 70;

type InnerProps = {
	w: number;
	h: number;
	radius: number;
	colors: PeersColors;
	lit: SharedValue<number>;
};

/**
 * Board `.cd .lit`: the floor light rising behind the chip, a plain radial
 * gradient (120% × 80% of the card at 78% / 118%) clipped to the card's rounded
 * rect. Mounted inside the card, before its text, on its first lighting. Only
 * its opacity moves, so the canvas redraws only while it fades.
 */
export function PeerInnerLight({ w, h, radius, colors, lit }: InnerProps) {
	const c = vec(I.cx * w, I.cy * h);
	const [floor, mid] = colors.floor;
	return (
		<Canvas
			pointerEvents="none"
			style={{ height: h, left: 0, position: "absolute", top: 0, width: w }}
		>
			<Group clip={rrect(rect(0, 0, w, h), radius, radius)} opacity={lit}>
				<Rect height={h} width={w} x={0} y={0}>
					<RadialGradient
						c={c}
						colors={[floor, mid, clearOf(mid)]}
						origin={c}
						positions={[...I.positions]}
						r={I.ry * h}
						transform={[{ scaleX: (I.rx * w) / (I.ry * h) }]}
					/>
				</Rect>
			</Group>
		</Canvas>
	);
}

type EdgeProps = {
	w: number;
	h: number;
	late: boolean;
	colors: PeersColors;
	on: SharedValue<number>;
	breath: SharedValue<number>;
};

/**
 * Board `.cw .edge`: the spectrum pill under the card's lower edge, blurred 22,
 * drawn outside and behind the card (a sibling before it, so the hold menu's
 * host doesn't clip it). The blur is baked once; per frame it only fades with
 * the light and the shared breath (.26 ↔ .18, late .18 ↔ .12).
 */
export function PeerEdgeGlow({ w, h, late, colors, on, breath }: EdgeProps) {
	const pillW = Math.max(0, w - E.inset * 2);
	const texW = pillW + BLEED * 2;
	const texH = E.height + BLEED * 2;
	const tex = useTexture(
		<RoundedRect
			height={E.height}
			r={E.height / 2}
			width={pillW}
			x={BLEED}
			y={BLEED}
		>
			<LinearGradient
				colors={colors.edge}
				end={vec(BLEED + pillW, 0)}
				start={vec(BLEED, 0)}
			/>
			<BlurMask blur={E.blur} style="normal" />
		</RoundedRect>,
		{ height: texH, width: texW },
		[pillW, colors.edge.join()]
	);
	const [lo, hi] = late ? E.lateA : E.dayA;
	// The shared breath is 1 under Reduce Motion, which holds the edge at its full α.
	const opacity = useDerivedValue(
		() => on.get() * (lo + (hi - lo) * breath.get())
	);
	const top = h + E.below - E.height - BLEED;
	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: texH,
				left: E.inset - BLEED,
				position: "absolute",
				top,
				width: texW,
			}}
		>
			<Image
				fit="fill"
				height={texH}
				image={tex}
				opacity={opacity}
				width={texW}
				x={0}
				y={0}
			/>
		</Canvas>
	);
}
