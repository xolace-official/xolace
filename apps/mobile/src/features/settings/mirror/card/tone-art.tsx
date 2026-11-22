import Svg, { Circle, G, Rect } from "react-native-svg";
import {
	ArtDefs,
	fill,
	type Palette,
} from "@/features/settings/mirror/card/tone-defs";
import type { MirrorTone } from "@/features/settings/mirror/mirror-model";

const STRIPE_STEP = 8.5;
const STRIPE_TOP = 104;
const STRIPE_H = 46;

function Stripes({ w, ink }: { w: number; ink: string }) {
	const n = Math.ceil((w * 1.2) / STRIPE_STEP);
	return (
		<G mask="url(#mt-ad-mask)" opacity={0.16}>
			{Array.from({ length: n }, (_, i) => (
				<Rect
					fill={ink}
					fillOpacity={0.9}
					height={STRIPE_H}
					key={`s${i.toString()}`}
					width={1.5}
					x={-w * 0.1 + i * STRIPE_STEP + 7}
					y={STRIPE_TOP}
				/>
			))}
		</G>
	);
}

const STARS: readonly (readonly [number, number, number, number])[] = [
	[0.12, 0.18, 1.2, 1],
	[0.28, 0.09, 1, 1],
	[0.72, 0.22, 1.4, 1],
	[0.88, 0.4, 1, 1],
	[0.55, 0.12, 1, 1],
	[0.4, 0.3, 1.2, 0.7],
	[0.92, 0.08, 1, 1],
	[0.06, 0.44, 1, 0.6],
];

type ArtProps = {
	tone: MirrorTone;
	w: number;
	h: number;
	dark: boolean;
	c: Palette;
};

export function ToneArt({ tone, w, h, dark, c }: ArtProps) {
	if (tone === "direct") {
		const bg = dark ? c["mirror-direct-dark"] : c["mirror-direct"];
		return (
			<Svg height={h} width={w}>
				<Rect fill={bg} height={h} width={w} x="0" y="0" />
			</Svg>
		);
	}
	return (
		<Svg height={h} width={w}>
			<ArtDefs c={c} h={h} tone={tone} />
			{fill(`mt-${tone}-l`)}
			{fill(`mt-${tone}-r`)}
			{tone === "adaptive" ? <Stripes ink={c["on-art"]} w={w} /> : null}
			{tone === "poetic" ? (
				<G opacity={0.8}>
					{STARS.map(([x, y, r, a]) => (
						<Circle
							cx={x * w}
							cy={y * h}
							fill={c["on-art"]}
							key={`${x}-${y}`}
							opacity={a}
							r={r * 0.6}
						/>
					))}
				</G>
			) : null}
		</Svg>
	);
}
