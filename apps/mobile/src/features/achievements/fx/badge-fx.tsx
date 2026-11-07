// The shared Skia fx kit (#693): a lit badge's art with a breathing glow
// behind it, a shimmer that sweeps across only the badge's own pixels, and
// sparkles twinkling at the rim. The unlock moment uses it; the detail page
// can. Callers skip it under reduced motion and draw the static Badge.
import {
	Canvas,
	Circle,
	Group,
	LinearGradient,
	Paint,
	Path,
	RadialGradient,
	Rect,
	Skia,
	Image as SkiaImage,
	useImage,
	vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import {
	Easing,
	type SharedValue,
	useDerivedValue,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";

/** The canvas reaches past the badge so the glow and sparkles have room. */
const STAGE = 1.5;
/** How far past the badge, per side and as a share of its size, the fx draws. */
export const FX_SPILL = (STAGE - 1) / 2;
/** The glow is full from the centre to just inside the rim, then fades out. */
const GLOW_STOPS = [0, 0.6, 0.8, 1];
const GLOW_MS = 2800;
const SHIMMER_MS = 3200;
const SPARKLE_MS = 2400;
/** The glow breathes between 0.15 and 0.75 opacity. */
const GLOW_REST = 0.45;
const GLOW_SWING = 0.3;
/** The band travels three badge-widths (off one side, across, off the other), half a badge wide. */
const SWEEP_SPAN = 3;
const BAND_WIDTH = 0.5;
/** Sparkles sit on a ring just outside the rim, growing from 40% as they light. */
const SPARKLE_RING = 0.4;
const SPARKLE_MIN_SCALE = 0.4;
const SPARKLE_SPIN = 0.6;
/** How pinched a star's waist is between its points. */
const STAR_WAIST = 0.22;
const TURN = Math.PI * 2;
/** Where each sparkle sits (angle around the rim, in turns), its size and its phase. */
const SPARKLES = [
	{ phase: 0, r: 0.07, turn: 0.1 },
	{ phase: 0.35, r: 0.05, turn: 0.32 },
	{ phase: 0.7, r: 0.06, turn: 0.58 },
	{ phase: 0.2, r: 0.045, turn: 0.8 },
	{ phase: 0.55, r: 0.055, turn: 0.93 },
] as const;

type Props = {
	/** The lit art; never the fallback, which is drawn unlit. */
	url: string;
	/** The badge's own size; the fx spill FX_SPILL past it without taking layout. */
	size: number;
	accessibilityLabel: string;
};

/** Loops 0 → 1 forever; under ReduceMotion.Always it stays put. */
function useLoop(duration: number, easing = Easing.linear) {
	const t = useSharedValue(0);
	useEffect(() => {
		t.set(withRepeat(withTiming(1, { duration, easing }), -1, false));
	}, [t, duration, easing]);
	return t;
}

export function BadgeFx({ accessibilityLabel, size, url }: Props) {
	const image = useImage(url);
	const ember = useTokenColor("ember");
	const stage = size * STAGE;
	const inset = (stage - size) / 2;
	const center = vec(stage / 2, stage / 2);

	const glow = useLoop(GLOW_MS, Easing.inOut(Easing.sin));
	const glowOpacity = useDerivedValue(
		() => GLOW_REST + GLOW_SWING * Math.sin(glow.get() * TURN)
	);

	// A diagonal band entering top-left and leaving bottom-right, then a rest.
	const sweep = useLoop(SHIMMER_MS, Easing.inOut(Easing.quad));
	const bandX = useDerivedValue(
		() => inset - size + sweep.get() * size * SWEEP_SPAN
	);
	const bandStart = useDerivedValue(() => vec(bandX.get(), inset));
	const bandEnd = useDerivedValue(() =>
		vec(bandX.get() + size * BAND_WIDTH, inset + size * BAND_WIDTH)
	);
	const art = { height: size, width: size, x: inset, y: inset };

	const twinkle = useLoop(SPARKLE_MS);

	return (
		<Canvas
			accessibilityLabel={accessibilityLabel}
			accessible
			pointerEvents="none"
			style={{ height: stage, margin: -inset, width: stage }}
		>
			<Circle c={center} opacity={glowOpacity} r={stage / 2}>
				<RadialGradient
					c={center}
					colors={[`${ember}AA`, `${ember}AA`, `${ember}44`, `${ember}00`]}
					positions={GLOW_STOPS}
					r={stage / 2}
				/>
			</Circle>
			{image ? (
				<>
					<SkiaImage {...art} fit="contain" image={image} />
					{/* The band is clipped to the art's alpha (srcIn), then screened on. */}
					<Group layer={<Paint blendMode="screen" />}>
						<SkiaImage {...art} fit="contain" image={image} />
						<Rect blendMode="srcIn" height={stage} width={stage} x={0} y={0}>
							<LinearGradient
								colors={[`${ember}00`, `${ember}AA`, `${ember}00`]}
								end={bandEnd}
								start={bandStart}
							/>
						</Rect>
					</Group>
				</>
			) : null}
			{SPARKLES.map((s) => (
				<Sparkle
					color={ember}
					key={s.turn}
					phase={s.phase}
					r={s.r * size}
					stage={stage}
					t={twinkle}
					turn={s.turn}
				/>
			))}
		</Canvas>
	);
}

/** A four-point star at the origin, `r` from centre to tip. */
function starPath(r: number) {
	const w = r * STAR_WAIST;
	return Skia.PathBuilder.Make()
		.moveTo(0, -r)
		.quadTo(w, -w, r, 0)
		.quadTo(w, w, 0, r)
		.quadTo(-w, w, -r, 0)
		.quadTo(-w, -w, 0, -r)
		.close()
		.detach();
}

type SparkleProps = {
	color: string;
	phase: number;
	r: number;
	stage: number;
	t: SharedValue<number>;
	turn: number;
};

function Sparkle({ color, phase, r, stage, t, turn }: SparkleProps) {
	const angle = turn * TURN;
	const reach = stage * SPARKLE_RING;
	const x = stage / 2 + Math.cos(angle) * reach;
	const y = stage / 2 + Math.sin(angle) * reach;
	// Each sparkle is lit for part of the loop, offset by its phase.
	const lit = useDerivedValue(() => {
		const s = Math.sin((t.get() + phase) * TURN);
		return s > 0 ? s * s : 0;
	});
	const transform = useDerivedValue(() => [
		{ translateX: x },
		{ translateY: y },
		{ scale: SPARKLE_MIN_SCALE + (1 - SPARKLE_MIN_SCALE) * lit.get() },
		{ rotate: lit.get() * SPARKLE_SPIN },
	]);
	return (
		<Group opacity={lit} transform={transform}>
			<Path color={color} path={starPath(r)} />
		</Group>
	);
}
