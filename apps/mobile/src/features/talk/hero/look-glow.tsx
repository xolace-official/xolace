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
const CORNER = Math.SQRT2;
const GLOW_BLUR = 26;
export const GLOW_BLEED = GLOW_BLUR * 2;
const HEX = /^#[0-9a-f]{6}$/i;

const clear = (color: string) =>
	HEX.test(color) ? `${color}00` : "transparent";

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
