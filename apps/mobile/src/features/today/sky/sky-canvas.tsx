import { Canvas, vec } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { useScheme } from "@/design/scheme";
import { useClock } from "@/lib/motion/clock";
import { useTokenColor } from "@/lib/use-token-color";
import { useTodayFrame } from "../today-frame";
import type { TodayPhase } from "../today-model";
import { SkyClouds, SkyMoon, SkySun } from "./sky-bodies";
import { useSkyBake, useSkySettled } from "./sky-cache";
import { Backdrop, BakedImage, LiveBackdrop } from "./sky-layers";
import { NIGHT_FEATHER, RIDGES, SKY, skyLook } from "./sky-model";
import { LiveRidges, RidgesArt, RidgesAt } from "./sky-ridges";
import { SkySprites } from "./sky-sprites";
import { useSkyMotion } from "./use-sky-motion";

const SKY_FPS = 30;

type Props = { phase: TodayPhase; width: number };

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
