import {
	Circle,
	Group,
	RadialGradient,
	Skia,
	useTexture,
	vec,
} from "@shopify/react-native-skia";

/**
 * firefly-swarm's glow atlas (`makeAtlas`), baked once: white on clear, tinted
 * per star when drawn (`Atlas` with modulate). Cell 0 is the soft halo (board
 * `.hl`: α .75 → 0, the .75 is the tint's), cell 1 the core's disc, cell 2 the
 * core's white centre (board `.co`: white at (.4, .36) to the star's colour at
 * .85 of r .7), clipped to the disc.
 */
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

/** The atlas's source rects, one per cell. */
export const CELL_RECTS = Array.from({ length: CELLS }, (_, i) =>
	Skia.XYWHRect(i * SPRITE, 0, SPRITE, SPRITE)
);

/** A colour string → [r, g, b] in 0–1, for a worklet to tint with. */
export function rgb(c: string): [number, number, number] {
	const f = Skia.Color(c);
	return [f[0], f[1], f[2]];
}
