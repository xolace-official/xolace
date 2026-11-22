import {
	BlurMask,
	Circle,
	Group,
	interpolateColors,
	Path,
	PathOp,
	RadialGradient,
	RoundedRect,
	Skia,
	vec,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import {
	CLOUD,
	CLOUDS,
	HALO_BREATH,
	HALO_R,
	MOON,
	SUN_LIGHT,
	SUN_R,
} from "./sky-model";
import type { SkyMotion } from "./use-sky-motion";

const PREMUL = 1;
const DISC_LIGHT = vec(
	-SUN_R + SUN_LIGHT.cx * SUN_R * 2,
	-SUN_R + SUN_LIGHT.cy * SUN_R * 2
);
const DISC_REACH = Math.hypot(
	SUN_R * 2 * (1 - SUN_LIGHT.cx),
	SUN_R * 2 * (1 - SUN_LIGHT.cy)
);
const ORIGIN = vec(0, 0);
const TAU = Math.PI * 2;

type Body = { motion: SkyMotion; clock: SharedValue<number>; sx: number };

export function SkySun({ motion: m, clock, sx }: Body) {
	const transform = useDerivedValue(() => [
		{ translateX: m.sunX.get() * sx },
		{ translateY: m.sunY.get() },
		{ scale: m.sunScale.get() },
	]);
	const breath = useDerivedValue(
		() => 0.5 - 0.5 * Math.cos((TAU * clock.get()) / HALO_BREATH.period)
	);
	const haloR = useDerivedValue(
		() => HALO_R * (1 + HALO_BREATH.scale * breath.get())
	);
	const haloOpacity = useDerivedValue(
		() => HALO_BREATH.low + (1 - HALO_BREATH.low) * breath.get()
	);
	const halo = useDerivedValue(() => {
		const c = interpolateColors(
			m.palette.get(),
			[0, 1],
			[m.sunFrom.get().halo, m.sunTo.get().halo]
		);
		return [c, "rgba(255,255,255,0)"];
	});
	const disc = useDerivedValue(() => [
		interpolateColors(
			m.palette.get(),
			[0, 1],
			[m.sunFrom.get().inner, m.sunTo.get().inner]
		),
		interpolateColors(
			m.palette.get(),
			[0, 1],
			[m.sunFrom.get().outer, m.sunTo.get().outer]
		),
	]);
	return (
		<Group opacity={m.sunOpacity} transform={transform}>
			<Circle cx={0} cy={0} opacity={haloOpacity} r={haloR}>
				<RadialGradient c={ORIGIN} colors={halo} flags={PREMUL} r={haloR} />
			</Circle>
			<Circle cx={0} cy={0} r={SUN_R}>
				<RadialGradient
					c={DISC_LIGHT}
					colors={disc}
					positions={[0, SUN_LIGHT.stop]}
					r={DISC_REACH}
				/>
			</Circle>
		</Group>
	);
}

const MOON_R = MOON.size / 2;

export function SkyMoon({ motion: m, sx }: Omit<Body, "clock">) {
	const cx = MOON.x * sx + MOON_R;
	const cy = MOON.y + MOON_R;
	const disc = Skia.PathBuilder.Make().addCircle(cx, cy, MOON_R).build();
	const cut = Skia.PathBuilder.Make()
		.addCircle(cx + MOON.cut.dx, cy + MOON.cut.dy, MOON_R)
		.build();
	const crescent = Skia.Path.MakeFromOp(disc, cut, PathOp.Difference) ?? disc;
	const transform = useDerivedValue(() => [
		{ translateY: MOON.rise * (1 - m.moonRise.get()) },
	]);
	return (
		<Group opacity={m.moon} transform={transform}>
			<Path color={MOON.glow} path={crescent}>
				<BlurMask blur={5} style="normal" />
			</Path>
			<Path color={MOON.color} path={crescent} />
		</Group>
	);
}

export function SkyClouds({
	motion: m,
	clock,
	sx,
	low,
}: Body & { low: boolean }) {
	return (
		<Group opacity={m.clouds}>
			{CLOUDS.map((c) => (
				<Cloud blur={!low} c={c} clock={clock} key={c.x} sx={sx} />
			))}
		</Group>
	);
}

function Cloud({
	c,
	clock,
	sx,
	blur,
}: {
	c: (typeof CLOUDS)[number];
	clock: SharedValue<number>;
	sx: number;
	blur: boolean;
}) {
	const mid = (CLOUD.from + CLOUD.to) / 2;
	const reach = (CLOUD.to - CLOUD.from) / 2;
	const x = useDerivedValue(() => {
		const k = Math.cos((Math.PI * clock.get()) / c.period);
		return c.x * sx + mid + (c.reverse ? reach : -reach) * k;
	});
	return (
		<RoundedRect
			color={CLOUD.color}
			height={CLOUD.h}
			r={CLOUD.h / 2}
			width={c.w}
			x={x}
			y={c.y}
		>
			{blur ? <BlurMask blur={CLOUD.blur} style="normal" /> : null}
		</RoundedRect>
	);
}
