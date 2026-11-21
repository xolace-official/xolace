import {
	BlurMask,
	DashPathEffect,
	Group,
	Image,
	LinearGradient,
	Mask,
	Path,
	useTexture,
	vec,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { REDUCED_FADE_MS } from "@/design/springs";
import { cardStart, clamp01 } from "../arrival/arrival-time";
import type { PeersColors } from "../peers-colors";
import { EASE } from "../peers-ease";
import { DRAW, STAR, YOU } from "../peers-look";
import { CARD_OF, type Line, starAt } from "./mark-geo";

const BAKE = 2;
const PAD = 12;
const REVEAL_W = 26;
const DOT_FADE_MS = 600;

type Props = {
	k: number;
	line: Line;
	ox: number;
	oy: number;
	n: number;
	dotted: boolean;
	reduced: boolean;
	colors: PeersColors;
	arrive: SharedValue<number>;
	hot: SharedValue<number>;
	gone: SharedValue<number>;
};

function boxOf(k: number) {
	const xs = [YOU.x, STAR[k][0]];
	const ys = [YOU.y, STAR[k][1]];
	const x = Math.min(...xs) - PAD;
	const y = Math.min(...ys) - PAD;
	return { h: Math.max(...ys) + PAD - y, w: Math.max(...xs) + PAD - x, x, y };
}

export function MarkLine({
	k,
	line,
	ox,
	oy,
	n,
	dotted,
	reduced,
	colors,
	arrive,
	hot,
	gone,
}: Props) {
	const box = boxOf(k);
	const from = colors.lineFrom;
	const to = colors.stars[k];
	const grad = (
		<LinearGradient
			colors={[from, to]}
			end={vec(STAR[k][0], STAR[k][1])}
			start={vec(YOU.x, YOU.y)}
		/>
	);
	const bake = (w: number) => (
		<Group
			transform={[
				{ scale: BAKE },
				{ translateX: -box.x },
				{ translateY: -box.y },
			]}
		>
			<Path path={line.path} strokeCap="round" strokeWidth={w} style="stroke">
				{grad}
				<BlurMask blur={DRAW.glowBlur} style="normal" />
			</Path>
		</Group>
	);
	const size = {
		height: Math.ceil(box.h * BAKE),
		width: Math.ceil(box.w * BAKE),
	};
	const glow = useTexture(bake(DRAW.glowW), size, [from, to]);
	const glowHot = useTexture(bake(DRAW.glowHotW), size, [from, to]);

	const ci = CARD_OF[k];
	const pose = useDerivedValue(() =>
		starAt(arrive.get(), k, n, false, reduced)
	);
	const draw = useDerivedValue(() => (dotted ? 1 : pose.get().draw));
	const lineA = useDerivedValue(() => {
		if (!dotted) {
			return pose.get().lineA;
		}
		if (ci >= n) {
			return 0;
		}
		const e = arrive.get() - cardStart(ci);
		return reduced
			? clamp01(e / REDUCED_FADE_MS)
			: EASE.css(clamp01(e / DOT_FADE_MS));
	});
	const glowA = useDerivedValue(
		() => lineA.get() * DRAW.glowA * (1 - clamp01(hot.get())) * (1 - gone.get())
	);
	const glowHotA = useDerivedValue(
		() => lineA.get() * DRAW.glowHotA * clamp01(hot.get()) * (1 - gone.get())
	);
	const coreW = useDerivedValue(
		() => DRAW.coreW + (DRAW.coreHotW - DRAW.coreW) * hot.get()
	);
	const coreA = useDerivedValue(() => {
		const h = clamp01(hot.get());
		const base = dotted
			? DRAW.dotA + (DRAW.dotHotA - DRAW.dotA) * h
			: DRAW.coreA + (1 - DRAW.coreA) * h;
		return lineA.get() * base * (1 - gone.get());
	});
	const dash = [DRAW.dash[0] * line.length, DRAW.dash[1] * line.length];

	return (
		<Group transform={[{ translateX: ox }, { translateY: oy }]}>
			{dotted ? null : (
				<Mask
					mask={
						<Path
							color="white"
							end={draw}
							path={line.path}
							strokeCap="round"
							strokeWidth={REVEAL_W}
							style="stroke"
						/>
					}
				>
					<Image
						fit="fill"
						height={box.h}
						image={glow}
						opacity={glowA}
						width={box.w}
						x={box.x}
						y={box.y}
					/>
					<Image
						fit="fill"
						height={box.h}
						image={glowHot}
						opacity={glowHotA}
						width={box.w}
						x={box.x}
						y={box.y}
					/>
				</Mask>
			)}
			<Path
				end={draw}
				opacity={coreA}
				path={line.path}
				strokeCap="round"
				strokeWidth={coreW}
				style="stroke"
			>
				{grad}
				{dotted ? <DashPathEffect intervals={dash} /> : null}
			</Path>
		</Group>
	);
}
