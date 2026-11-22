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
import type { SharedValue } from "react-native-reanimated";
import { clearOf } from "@/design/clear-of";

const FLOOR = {
	cx: 0.5,
	cy: 1.18,
	positions: [0, 0.42, 0.68],
	rx: 1.2,
	ry: 0.8,
} as const;
const EDGE = { below: 10, blur: 22, height: 40, inset: 40 } as const;

const BLEED = 70;

export function FloorLight({
	w,
	h,
	radius,
	colors,
	on,
}: {
	w: number;
	h: number;
	radius: number;
	colors: string[];
	on: SharedValue<number>;
}) {
	const c = vec(FLOOR.cx * w, FLOOR.cy * h);
	return (
		<Canvas
			pointerEvents="none"
			style={{ height: h, left: 0, position: "absolute", top: 0, width: w }}
		>
			<Group clip={rrect(rect(0, 0, w, h), radius, radius)} opacity={on}>
				<Rect height={h} width={w} x={0} y={0}>
					<RadialGradient
						c={c}
						colors={[colors[0], colors[1], clearOf(colors[1])]}
						origin={c}
						positions={[...FLOOR.positions]}
						r={FLOOR.ry * h}
						transform={[{ scaleX: (FLOOR.rx * w) / (FLOOR.ry * h) }]}
					/>
				</Rect>
			</Group>
		</Canvas>
	);
}

export function EdgeGlow({
	w,
	h,
	colors,
	on,
}: {
	w: number;
	h: number;
	colors: string[];
	on: SharedValue<number>;
}) {
	const pillW = Math.max(0, w - EDGE.inset * 2);
	const texW = pillW + BLEED * 2;
	const texH = EDGE.height + BLEED * 2;
	const tex = useTexture(
		<RoundedRect
			height={EDGE.height}
			r={EDGE.height / 2}
			width={pillW}
			x={BLEED}
			y={BLEED}
		>
			<LinearGradient
				colors={[...colors]}
				end={vec(BLEED + pillW, 0)}
				start={vec(BLEED, 0)}
			/>
			<BlurMask blur={EDGE.blur} style="normal" />
		</RoundedRect>,
		{ height: texH, width: texW },
		[pillW, colors.join()]
	);
	const top = h + EDGE.below - EDGE.height - BLEED;
	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: texH,
				left: EDGE.inset - BLEED,
				position: "absolute",
				top,
				width: texW,
			}}
		>
			<Image
				fit="fill"
				height={texH}
				image={tex}
				opacity={on}
				width={texW}
				x={0}
				y={0}
			/>
		</Canvas>
	);
}
