import { View } from "react-native";
import Svg, {
	Circle,
	Defs,
	LinearGradient,
	RadialGradient,
	Stop,
} from "react-native-svg";
import { EASING, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import type { VoiceValue } from "@/lib/talk/voice-options";
import { useTokenColors } from "@/lib/use-token-color";

/**
 * A voice as a still orb (board `.orb`): a radial light → mid → deep (`--color-orb-<voice>-*`)
 * with a soft inner shade. It doesn't drift on this screen (handoff §4). While its clip plays
 * two rings grow out of it (1.6 s, the second 0.8 s behind, an Ease loop); with Reduce Motion
 * one ring holds still instead.
 */
const RING_MS = 1600;
const RING_SCALE = 1.55;
/** The still ring with Reduce Motion: just outside the chosen ring. */
const STILL_RING_GAP = 7;

function OrbArt({ size, id, c }: { size: number; id: string; c: string[] }) {
	const [light, mid, deep, white, shade] = c;
	const r = size / 2;
	return (
		<Svg height={size} width={size}>
			<Defs>
				<RadialGradient
					cx={0.3}
					cy={0.25}
					fx={0.3}
					fy={0.25}
					id={`o-${id}`}
					rx={1.2}
					ry={0.9}
				>
					<Stop offset={0} stopColor={light} />
					<Stop offset={0.55} stopColor={mid} />
					<Stop offset={1} stopColor={deep} />
				</RadialGradient>
				{/* inset 0 3 8 white .35 at the top, inset 0 -6 12 black .18 at the bottom */}
				<LinearGradient id={`s-${id}`} x1={0} x2={0} y1={0} y2={1}>
					<Stop offset={0} stopColor={white} stopOpacity={0.3} />
					<Stop offset={0.22} stopColor={white} stopOpacity={0} />
					<Stop offset={0.72} stopColor={shade} stopOpacity={0} />
					<Stop offset={1} stopColor={shade} stopOpacity={0.18} />
				</LinearGradient>
			</Defs>
			<Circle cx={r} cy={r} fill={`url(#o-${id})`} r={r} />
			<Circle cx={r} cy={r} fill={`url(#s-${id})`} r={r} />
		</Svg>
	);
}

/** One growing ring. Ease turns the wrapper; the inner view draws the border (Ease can't). */
function Ring({
	size,
	color,
	delay,
}: {
	size: number;
	color: string;
	delay: number;
}) {
	return (
		<EaseView
			className="absolute"
			pointerEvents="none"
			style={{ height: size, width: size }}
			{...loopProps({
				delay,
				easing: EASING.outQuad,
				from: { opacity: 0.8, scale: 1 },
				mode: "repeat",
				periodMs: RING_MS,
				reduced: false,
				to: { opacity: 0, scale: RING_SCALE },
			})}
		>
			<View
				className="flex-1 border-[1.5px]"
				style={{ borderColor: color, borderRadius: size / 2 }}
			/>
		</EaseView>
	);
}

/** A ring `gap` outside the orb, `width` thick. */
function Halo(p: { size: number; gap: number; width: number; color: string }) {
	const out = p.gap + p.width;
	return (
		<View
			className="absolute"
			pointerEvents="none"
			style={{
				borderColor: p.color,
				borderRadius: p.size / 2 + out,
				borderWidth: p.width,
				bottom: -out,
				left: -out,
				right: -out,
				top: -out,
			}}
		/>
	);
}

export function StillOrb({
	voice,
	size,
	id,
	ring,
	ringGap = 3,
	playing = false,
	reduced = false,
	shadow = false,
}: {
	voice: VoiceValue;
	size: number;
	/** Unique per orb on the screen (the SVG gradient ids). */
	id: string;
	/** The chosen ring's colour: 2 pt, `ringGap` out. */
	ring?: string;
	ringGap?: number;
	playing?: boolean;
	reduced?: boolean;
	/** A drop shadow in the deep colour (the big orbs). */
	shadow?: boolean;
}) {
	const c = useTokenColors([
		`orb-${voice}-light`,
		`orb-${voice}-mid`,
		`orb-${voice}-deep`,
		"on-art",
		"mirror-orb-shade",
	]);
	const [, mid, deep] = c;
	return (
		<View
			className="items-center justify-center"
			style={{ height: size, width: size }}
		>
			{playing && !reduced ? (
				<>
					<Ring color={mid} delay={0} size={size} />
					<Ring color={mid} delay={RING_MS / 2} size={size} />
				</>
			) : null}
			{playing && reduced ? (
				<Halo color={mid} gap={STILL_RING_GAP} size={size} width={1.5} />
			) : null}
			<View
				style={{
					borderRadius: size / 2,
					boxShadow: shadow ? `0px 6px 14px -8px ${deep}` : undefined,
					height: size,
					width: size,
				}}
			>
				<OrbArt c={c} id={id} size={size} />
			</View>
			{ring ? <Halo color={ring} gap={ringGap} size={size} width={2} /> : null}
		</View>
	);
}
