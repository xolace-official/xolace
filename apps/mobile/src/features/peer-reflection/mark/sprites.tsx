import {
	Circle,
	Group,
	RadialGradient,
	Skia,
	useTexture,
	vec,
} from "@shopify/react-native-skia";

export const SPRITE = 96;
export const CELL = { disc: 1, halo: 0, light: 2 } as const;

const R = SPRITE / 2;
const LIGHT_X = 2 * SPRITE;
const LIGHT_AT = { r: 0.7, stop: 0.85, x: 0.4, y: 0.36 } as const;
const CELLS = 3;
const DISC = Skia.PathBuilder.Make()
	.addCircle(LIGHT_X + R, R, R - 1)
	.build();
const WHITE = "rgba(255,255,255,1)";
const CLEAR = "rgba(255,255,255,0)";

export function useSprites() {
	return useTexture(
		<Group>
			<Circle cx={R} cy={R} r={R}>
				<RadialGradient c={vec(R, R)} colors={[WHITE, CLEAR]} r={R} />
			</Circle>
			<Circle color="white" cx={SPRITE + R} cy={R} r={R - 1} />
			<Group clip={DISC}>
				<Circle
					cx={LIGHT_X + LIGHT_AT.x * SPRITE}
					cy={LIGHT_AT.y * SPRITE}
					r={SPRITE}
				>
					<RadialGradient
						c={vec(LIGHT_X + LIGHT_AT.x * SPRITE, LIGHT_AT.y * SPRITE)}
						colors={[WHITE, CLEAR]}
						positions={[0, LIGHT_AT.stop]}
						r={LIGHT_AT.r * SPRITE}
					/>
				</Circle>
			</Group>
		</Group>,
		{ height: SPRITE, width: SPRITE * CELLS },
		[]
	);
}

export const CELL_RECTS = Array.from({ length: CELLS }, (_, i) =>
	Skia.XYWHRect(i * SPRITE, 0, SPRITE, SPRITE)
);

export function rgb(c: string): [number, number, number] {
	const f = Skia.Color(c);
	return [f[0], f[1], f[2]];
}
