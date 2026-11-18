import { Canvas, vec } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";
import { useClock } from "../today-clock";
import { useTodayFrame } from "../today-frame";
import type { TodayPhase } from "../today-model";
import { SkyClouds, SkyMoon, SkySun } from "./sky-bodies";
import { useSkyBake, useSkySettled } from "./sky-cache";
import { Backdrop, BakedImage, LiveBackdrop } from "./sky-layers";
import { NIGHT_FEATHER, RIDGES, SKY, skyLook } from "./sky-model";
import { LiveRidges, RidgesArt, RidgesAt } from "./sky-ridges";
import { SkySprites } from "./sky-sprites";
import { useSkyMotion } from "./use-sky-motion";

/**
 * The sky draws at 30 fps: at that rate the halo breath (6 s), cloud drift (1.6 pt/s
 * at most) and twinkles move well under a pixel a frame, the embers about one.
 */
const SKY_FPS = 30;

type Props = { phase: TodayPhase; width: number };

/**
 * The sky behind Today's header: one declarative Skia canvas, 420 pt tall,
 * scrolling with the page. One phase drives every layer (walking-steps-buddy);
 * the clock only runs while the sky is on screen and Today is live.
 *
 * At rest, the layers that don't move with the clock (the three palettes, the
 * night front and the ridges) are drawn from two textures baked for the phase;
 * from a phase change until they have finished moving, they are drawn live.
 */
export function SkyCanvas({ phase, width }: Props) {
	const { scrollY, live, reduced, low } = useTodayFrame();
	const dark = useScheme() === "dark";
	const look = skyLook(dark);
	const motion = useSkyMotion(phase, reduced, dark);
	const onScreen = useDerivedValue(() => scrollY.get() < SKY.h);
	const clock = useClock(live, onScreen, SKY_FPS);
	const sx = width / SKY.w;
	const page = useTokenColor("background");

	const settled = useSkySettled(phase, reduced);
	const rest = restOf(phase);
	const baked = useSkyBake(
		// The scheme is in the key as well as the page: a theme change must re-bake even
		// if two themes shared a page colour (a static picture would keep the old sky).
		`${phase}|${width}|${page}|${dark ? "dark" : "light"}`,
		{
			element: (
				<Backdrop
					{...rest.backdrop}
					gradients={look.gradients}
					page={page}
					width={width}
				/>
			),
			height: SKY.h,
			width,
		},
		{
			element: <RidgesArt colors={look.ridges[phase]} sx={sx} />,
			height: RIDGES.height,
			width,
		}
	);
	const cached = settled ? baked : null;
	// Dawn and day show no stars or embers: the atlas mounts only by evening and
	// late, and through any phase change (the slowest sprite fade, the first
	// star's 0.4 + 1.2 s, ends inside the settle time).
	const sprites = phase === "evening" || phase === "late" || !settled;

	return (
		<Canvas
			pointerEvents="none"
			style={{ height: SKY.h, left: 0, position: "absolute", top: 0, width }}
		>
			{cached ? (
				<BakedImage height={SKY.h} image={cached.backdrop} width={width} />
			) : (
				<LiveBackdrop
					gradients={look.gradients}
					motion={motion}
					page={page}
					width={width}
				/>
			)}
			<SkySun clock={clock} motion={motion} sx={sx} />
			<SkyMoon motion={motion} sx={sx} />
			<SkyClouds clock={clock} low={low} motion={motion} sx={sx} />
			<RidgesAt scrollY={scrollY}>
				{cached ? (
					<BakedImage
						height={RIDGES.height}
						image={cached.ridges}
						width={width}
					/>
				) : (
					<LiveRidges motion={motion} sx={sx} />
				)}
			</RidgesAt>
			{sprites ? (
				<SkySprites clock={clock} low={low} motion={motion} sx={sx} />
			) : null}
		</Canvas>
	);
}

/** The static layers' values at rest in a phase: where useSkyMotion's timings end. */
function restOf(phase: TodayPhase) {
	const late = phase === "late";
	const night = late ? 1 : -NIGHT_FEATHER;
	return {
		backdrop: {
			dawn: phase === "dawn" ? 1 : 0,
			day: phase === "day" ? 1 : 0,
			evening: phase === "evening" || late ? 1 : 0,
			nightEnd: vec(0, SKY.h * (night + NIGHT_FEATHER)),
			nightShown: late ? 1 : 0,
			nightStart: vec(0, SKY.h * night),
		},
	};
}
