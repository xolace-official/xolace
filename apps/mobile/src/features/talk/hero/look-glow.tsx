import {
	Blur,
	Canvas,
	RadialGradient,
	Rect,
	vec,
} from "@shopify/react-native-skia";
import type { TalkLook } from "@xolace/backend/convex/lib/voices";
import { useTokenColor } from "@/lib/use-token-color";
import { LOOKS } from "../companion-look";

const CLEAR_AT = 0.68;
/** CSS `radial-gradient(circle, …)` reaches the box's farthest corner: √2 × half the side. */
const CORNER = Math.SQRT2;
/** The board blurs the glow 26 px; the canvas leaves room for the blur to spread. */
const GLOW_BLUR = 26;
export const GLOW_BLEED = GLOW_BLUR * 2;
const HEX = /^#[0-9a-f]{6}$/i;

/** The colour at no strength: a `#rrggbb` token gets an alpha of 0. */
const clear = (color: string) =>
	HEX.test(color) ? `${color}00` : "transparent";

/**
 * The soft radial glow behind the centred face (board `.lk .glow`: inset −26 pt, a radial
 * gradient to clear at 68%, blurred 26 px). Drawn once; the slot fades and breathes it with
 * transforms only. The canvas is `size + 2 × GLOW_BLEED` wide.
 */
export function LookGlow({ look, size }: { look: TalkLook; size: number }) {
	const color = useTokenColor(LOOKS[look].glow);
	const full = size + GLOW_BLEED * 2;
	const c = full / 2;
	return (
		<Canvas pointerEvents="none" style={{ height: full, width: full }}>
			<Rect height={size} width={size} x={GLOW_BLEED} y={GLOW_BLEED}>
				<RadialGradient
					c={vec(c, c)}
					colors={[color, clear(color)]}
					positions={[0, CLEAR_AT]}
					r={(size / 2) * CORNER}
				/>
				<Blur blur={GLOW_BLUR / 2} />
			</Rect>
		</Canvas>
	);
}
