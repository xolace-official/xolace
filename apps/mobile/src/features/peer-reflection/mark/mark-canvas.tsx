import {
	Atlas,
	Canvas,
	Circle,
	Group,
	Skia,
	type SkRSXform,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { clamp01 } from "../arrival/arrival-time";
import type { PeersColors } from "../peers-colors";
import { EASE } from "../peers-ease";
import { DRAW, POINT } from "../peers-look";
import {
	blinkAt,
	LINES,
	loadBreath,
	pointAlpha,
	pointAt,
	starAt,
} from "./mark-geo";
import { MarkLine } from "./mark-line";
import { CELL, CELL_RECTS, rgb, SPRITE, useSprites } from "./sprites";
import type { StarValues } from "./use-star-values";

const STARS = [0, 1, 2, 3] as const;
/** The tile's two upper circles, drawn as rings until they fill. */
const TILE_STARS = [1, 2] as const;
/** `ldb`'s delay per star: s1 0, s2 .4 s (board `--ld`). */
const LD_DELAY = [0, 0, 400, 0];
/** Per star: halo, disc, light, blink; then per line: the point's far glow, near glow and core. */
const SRC = [
	...STARS.flatMap(() => [
		CELL_RECTS[CELL.halo],
		CELL_RECTS[CELL.disc],
		CELL_RECTS[CELL.light],
		CELL_RECTS[CELL.halo],
	]),
	...STARS.flatMap(() => [
		CELL_RECTS[CELL.halo],
		CELL_RECTS[CELL.halo],
		CELL_RECTS[CELL.disc],
	]),
];
/** `.st .hl` carries α .75 at its centre. */
const HALO_A = 0.75;
const WHITE = [1, 1, 1] as const;

export type MarkProps = {
	/** Board → band: x + ox, y + oy. */
	ox: number;
	oy: number;
	n: number;
	none: boolean;
	dotted: boolean;
	loading: boolean;
	reduced: boolean;
	colors: PeersColors;
	ink3: string;
	arrive: SharedValue<number>;
	/** ms into the loading loop (1.5 s). */
	ld: SharedValue<number>;
	stars: StarValues;
};

/**
 * The mark: one Skia canvas for the four lines and the stars (a glow line under
 * a core; no twinkle, sky or names). Every glow is baked once; per frame the
 * stars are one atlas draw of moved, scaled and faded sprites. At rest no input
 * changes, so nothing redraws. Your star is drawn apart (`YouStar`) so its
 * breath is a view's opacity, not a redraw.
 */
export function MarkCanvas({
	W,
	H,
	...p
}: MarkProps & { W: number; H: number }) {
	const { ox, oy, n, none, reduced, colors, arrive, stars } = p;
	const sprites = useSprites();
	const pal = colors.stars.map(rgb);
	const [core, near, far] = colors.point.map(rgb);
	const { hotS, gone, blink, pl } = stars;

	const frame = useDerivedValue(() => {
		const a = arrive.get();
		const xf: SkRSXform[] = [];
		const cols: Float32Array[] = [];
		const put = (
			r: number,
			at: { x: number; y: number },
			c: readonly number[],
			alpha: number
		) => {
			const s = (2 * Math.max(0, r)) / SPRITE;
			xf.push(Skia.RSXform(s, 0, ox + at.x - r, oy + at.y - r));
			cols.push(Float32Array.of(c[0], c[1], c[2], clamp01(alpha)));
		};
		for (const k of STARS) {
			const s = starAt(a, k, n, none, reduced);
			const g = gone[k].get();
			const hs = hotS[k].get();
			const inA = s.inA * (1 - g);
			const sc = s.scale * (1 - 0.7 * g);
			const haloR = DRAW.halo * sc * (1 + (DRAW.hotScale - 1) * hs);
			const haloA = DRAW.haloA + (1 - DRAW.haloA) * clamp01(hs);
			put(haloR, s, pal[k], HALO_A * inA * s.halo * haloA);
			const cr = (DRAW.ring + (DRAW.core - DRAW.ring) * s.morph) * sc;
			put(cr, s, pal[k], inA * s.morph);
			put(cr, s, WHITE, inA * s.morph);
			const b = blinkAt(blink[k].get());
			put(DRAW.blink * b.s, s, pal[k], s.draw > 0 ? HALO_A * b.a * (1 - g) : 0);
		}
		for (const k of STARS) {
			const u = pl[k].get();
			const at = pointAt(LINES[k].lookup, EASE.line(clamp01(u)));
			const al = pointAlpha(u);
			put(POINT.farR, at, far, POINT.farA * al);
			put(POINT.nearR, at, near, POINT.nearA * al);
			put(DRAW.pl, at, core, al);
		}
		return { cols, xf };
	});
	const transforms = useDerivedValue(() => frame.get().xf);
	const tints = useDerivedValue(() => frame.get().cols);

	return (
		<Canvas
			pointerEvents="none"
			style={{ height: H, left: 0, position: "absolute", top: 0, width: W }}
		>
			{LINES.map((line, k) => (
				<MarkLine
					arrive={arrive}
					colors={colors}
					dotted={p.dotted}
					gone={gone[k]}
					hot={stars.hot[k]}
					k={k}
					key={k}
					line={line}
					n={n}
					ox={ox}
					oy={oy}
					reduced={reduced}
				/>
			))}
			<Group transform={[{ translateX: ox }, { translateY: oy }]}>
				{TILE_STARS.map((k) => (
					<MarkRing key={k} {...p} k={k} />
				))}
			</Group>
			<Atlas
				colorBlendMode="modulate"
				colors={tints}
				image={sprites}
				sprites={SRC}
				transforms={transforms}
			/>
		</Canvas>
	);
}

/** `.st.mk .co`: the tile's circle as a ring (r 9, stroke 2, ink 3 at .5), shrinking into the star as it fills. */
function MarkRing({
	k,
	n,
	none,
	loading,
	reduced,
	ink3,
	arrive,
	ld,
}: MarkProps & { k: number }) {
	const pose = useDerivedValue(() => starAt(arrive.get(), k, n, none, reduced));
	const cx = useDerivedValue(() => pose.get().x);
	const cy = useDerivedValue(() => pose.get().y);
	const r = useDerivedValue(
		() => DRAW.ring + (DRAW.core - DRAW.ring) * pose.get().morph
	);
	const opacity = useDerivedValue(() => {
		const breath = loading ? loadBreath(ld.get(), LD_DELAY[k]) : 1;
		return DRAW.ringA * pose.get().ring * pose.get().inA * breath;
	});
	return (
		<Circle
			color={ink3}
			cx={cx}
			cy={cy}
			opacity={opacity}
			r={r}
			strokeWidth={DRAW.ringW}
			style="stroke"
		/>
	);
}
