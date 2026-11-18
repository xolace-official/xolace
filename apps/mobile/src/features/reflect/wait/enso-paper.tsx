import {
	Image,
	Mask,
	RadialGradient,
	Rect,
	vec,
} from "@shopify/react-native-skia";
import { PixelRatio } from "react-native";
import { useTokenColors } from "@/lib/use-token-color";
import { bakePaper } from "./enso-art";

/** The paper's grain sits under the ink, faint, fading out toward the canvas edge. */
const PAPER = { day: 0.35, night: 0.12 } as const;
const FADE_AT = [0, 0.6, 1];
/** Baked at no more than 2× (the grain is soft; 3× only costs memory). */
const MAX_SCALE = 2;
const FADE = [
	"reflect-paper-fade-1",
	"reflect-paper-fade-2",
	"reflect-paper-fade-3",
] as const;

/** The rice paper under the ensō, baked once per size, masked to a soft disc. */
export function EnsoPaper({ box, late }: { box: number; late: boolean }) {
	const fade = useTokenColors(FADE);
	const paper = bakePaper(box, box, Math.min(PixelRatio.get(), MAX_SCALE));
	if (!paper) {
		return null;
	}
	return (
		<Mask
			mask={
				<Rect height={box} width={box} x={0} y={0}>
					<RadialGradient
						c={vec(box / 2, box / 2)}
						colors={fade}
						positions={FADE_AT}
						r={box / 2}
					/>
				</Rect>
			}
		>
			<Image
				blendMode={late ? "overlay" : "multiply"}
				fit="fill"
				height={box}
				image={paper}
				opacity={late ? PAPER.night : PAPER.day}
				width={box}
				x={0}
				y={0}
			/>
		</Mask>
	);
}
