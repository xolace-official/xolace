import { Image } from "expo-image";
import { useState } from "react";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import {
	age,
	CLOCK_START,
	type Eng,
	type Geo,
} from "@/features/achievements/arrival/arrival-motion";
import { FIRE_GLOW } from "@/features/achievements/badge-palette";
import { clamp, easeOut, fs, TAU } from "@/features/achievements/motion-math";

const LOOP = require("@/assets/images/flux/flux-campfire-loop.webp");
const STILL = require("@/assets/images/flux/flux-campfire-still.webp");
/** Flux: 204 × 272 at the board's top 128, growing from its feet. */
const FLUX = { h: 272, top: 128, w: 204 } as const;
const FLUX_IN_MS = 450;
const FLUX_GROW = { from: 0.92, w: 9, z: 0.62 } as const;
/** The fire's glow: 440 pt, fading in over 700 ms and breathing on 2.6 s, scaling .7 → 1 over 900. */
const GLOW_D = 440;
const GLOW = {
	in: 700,
	period: 2600,
	rest: 0.82,
	scaleFrom: 0.7,
	scaleIn: 900,
	swing: 0.18,
};
const GLOW_MID = 0.55;
const REDUCED_FADE_MS = 200;

/** Flux by the fire, and the fire's glow behind them. */
export function Fire({
	eng,
	geo,
	dark,
	rm,
	hidden,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	dark: boolean;
	rm: boolean;
	hidden: boolean;
}) {
	const glow = useAnimatedStyle(() => {
		const e = eng.get();
		const m = age(e, e.tm);
		const breath = e.rm ? 0 : GLOW.swing * Math.sin((m / GLOW.period) * TAU);
		return {
			opacity: (e.rm ? 1 : easeOut(m / GLOW.in)) * (GLOW.rest + breath),
			transform: [
				{
					scale: e.rm
						? 1
						: GLOW.scaleFrom + (1 - GLOW.scaleFrom) * easeOut(m / GLOW.scaleIn),
				},
			],
		};
	});
	const flux = useAnimatedStyle(() => {
		const e = eng.get();
		const m = age(e, e.tm);
		return {
			opacity: e.rm ? clamp(m / REDUCED_FADE_MS) : easeOut(m / FLUX_IN_MS),
			transform: [
				{
					scale: e.rm
						? 1
						: FLUX_GROW.from +
							(1 - FLUX_GROW.from) * fs(m / 1000, FLUX_GROW.w, FLUX_GROW.z),
				},
			],
		};
	});
	return (
		<>
			<Animated.View
				className="absolute"
				style={[
					{
						height: GLOW_D,
						left: geo.fx - GLOW_D / 2,
						top: geo.fy - GLOW_D / 2,
						width: GLOW_D,
					},
					glow,
				]}
			>
				<FireGlow dark={dark} />
			</Animated.View>
			<Animated.View
				className="absolute"
				style={[
					{
						height: FLUX.h,
						left: geo.cx - FLUX.w / 2,
						top: FLUX.top + geo.dy,
						transformOrigin: "50% 100%",
						width: FLUX.w,
					},
					flux,
				]}
			>
				<Flux eng={eng} hidden={hidden} rm={rm} />
			</Animated.View>
		</>
	);
}

/**
 * The campfire loop, or the still under Reduce Motion. Staged hidden in the
 * host, the loop holds its first frame (an image animating out of sight kept
 * the screen from settling) and plays from the clock's first step.
 */
function Flux({
	eng,
	rm,
	hidden,
}: {
	eng: SharedValue<Eng>;
	rm: boolean;
	hidden: boolean;
}) {
	const [live, setLive] = useState(!hidden);
	useAnimatedReaction(
		() => eng.get().now > CLOCK_START,
		(on, was) => {
			if (hidden && on && !was) {
				scheduleOnRN(setLive, true);
			}
		}
	);
	return (
		<Image
			accessible={false}
			autoplay={!rm && live}
			contentFit="contain"
			placeholder={STILL}
			placeholderContentFit="contain"
			source={rm ? STILL : LOOP}
			style={{ height: FLUX.h, width: FLUX.w }}
		/>
	);
}

/** The fire's glow: a radial from the fire's colour to clear (Daylight softer). */
function FireGlow({ dark }: { dark: boolean }) {
	const c = dark ? FIRE_GLOW.dusk : FIRE_GLOW.day;
	return (
		<Svg height={GLOW_D} width={GLOW_D}>
			<Defs>
				<RadialGradient cx="50%" cy="50%" id="fire" r="50%">
					<Stop offset="0" stopColor={c.inner} stopOpacity={c.innerOpacity} />
					<Stop
						offset={GLOW_MID}
						stopColor={c.outer}
						stopOpacity={c.outerOpacity}
					/>
					<Stop offset="1" stopColor={c.outer} stopOpacity={0} />
				</RadialGradient>
			</Defs>
			<Circle
				cx={GLOW_D / 2}
				cy={GLOW_D / 2}
				fill="url(#fire)"
				r={GLOW_D / 2}
			/>
		</Svg>
	);
}
