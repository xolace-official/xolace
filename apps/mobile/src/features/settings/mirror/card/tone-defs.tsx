import {
	Defs,
	LinearGradient,
	Mask,
	RadialGradient,
	Rect,
	Stop,
} from "react-native-svg";
import type { MirrorTone } from "@/features/settings/mirror/mirror-model";
import { useTokenColors } from "@/lib/use-token-color";

/**
 * Each tone's light on the sample card (board `.ly.adaptive` … `.ly.witnessed`), in SVG. Every
 * stop is an opaque token with its alpha in `stopOpacity` (react-native-svg drops a stop
 * colour's own alpha).
 */
type StopDef = readonly [offset: number, color: string, opacity: number];

const TOKENS = [
	"mirror-adaptive-a",
	"mirror-adaptive-b",
	"mirror-adaptive-c",
	"mirror-adaptive-glow",
	"mirror-poetic-a",
	"mirror-poetic-b",
	"mirror-poetic-c",
	"mirror-poetic-glow",
	"mirror-gentle-a",
	"mirror-gentle-b",
	"mirror-gentle-c",
	"mirror-gentle-glow",
	"mirror-direct",
	"mirror-direct-dark",
	"mirror-witnessed-a",
	"mirror-witnessed-b",
	"mirror-witnessed-c",
	"mirror-witnessed-glow",
	"mirror-witnessed-ember",
	"on-art",
] as const;
type Token = (typeof TOKENS)[number];
export type Palette = Record<Token, string>;

export function usePalette(): Palette {
	const values = useTokenColors(TOKENS);
	return Object.fromEntries(TOKENS.map((t, i) => [t, values[i]])) as Palette;
}

function line(deg: number) {
	const r = (deg * Math.PI) / 180;
	const dx = Math.sin(r) / 2;
	const dy = Math.cos(r) / 2;
	return { x1: 0.5 - dx, x2: 0.5 + dx, y1: 0.5 + dy, y2: 0.5 - dy };
}

const stopsOf = (stops: readonly StopDef[]) =>
	stops.map(([o, c, a]) => (
		<Stop key={o} offset={o} stopColor={c} stopOpacity={a} />
	));

function Lin(p: { id: string; deg: number; stops: readonly StopDef[] }) {
	return (
		<LinearGradient id={p.id} {...line(p.deg)}>
			{stopsOf(p.stops)}
		</LinearGradient>
	);
}

function Rad(p: {
	id: string;
	at: readonly [cx: number, cy: number, rx: number, ry: number];
	stops: readonly StopDef[];
}) {
	const [cx, cy, rx, ry] = p.at;
	return (
		<RadialGradient cx={cx} cy={cy} fx={cx} fy={cy} id={p.id} rx={rx} ry={ry}>
			{stopsOf(p.stops)}
		</RadialGradient>
	);
}

export const fill = (id: string) => (
	<Rect fill={`url(#${id})`} height="100%" width="100%" x="0" y="0" />
);

type Lit = Exclude<MirrorTone, "direct">;

const LIGHTS: Record<
	Lit,
	{
		deg: number;
		mid: number;
		glowAt: readonly [number, number, number, number];
		glow: readonly (readonly [number, Token, number])[];
	}
> = {
	adaptive: {
		deg: 155,
		glow: [
			[0, "mirror-adaptive-glow", 0.55],
			[0.6, "mirror-adaptive-glow", 0],
		],
		glowAt: [0.85, 0.1, 0.9, 0.7],
		mid: 0.58,
	},
	gentle: {
		deg: 165,
		glow: [
			[0, "mirror-gentle-glow", 1],
			[0.6, "mirror-gentle-glow", 0],
		],
		glowAt: [0.15, 0, 0.8, 0.7],
		mid: 0.6,
	},
	poetic: {
		deg: 170,
		glow: [
			[0, "mirror-poetic-glow", 0.5],
			[0.7, "mirror-poetic-glow", 0],
		],
		glowAt: [0.8, 0, 0.7, 0.55],
		mid: 0.6,
	},
	witnessed: {
		deg: 180,
		glow: [
			[0, "mirror-witnessed-glow", 0.85],
			[0.45, "mirror-witnessed-ember", 0.35],
			[0.75, "mirror-witnessed-ember", 0],
		],
		glowAt: [0.5, 1.15, 0.85, 0.6],
		mid: 0.7,
	},
};

const STRIPE_MID = 127;
const STRIPE_HALF = 23;

export function ArtDefs({ tone, h, c }: { tone: Lit; h: number; c: Palette }) {
	const l = LIGHTS[tone];
	const ink = c["on-art"];
	return (
		<Defs>
			<Lin
				deg={l.deg}
				id={`mt-${tone}-l`}
				stops={[
					[0, c[`mirror-${tone}-a`], 1],
					[l.mid, c[`mirror-${tone}-b`], 1],
					[1, c[`mirror-${tone}-c`], 1],
				]}
			/>
			<Rad
				at={l.glowAt}
				id={`mt-${tone}-r`}
				stops={l.glow.map(([o, t, a]) => [o, c[t], a] as const)}
			/>
			{tone === "adaptive" ? (
				<>
					<Rad
						at={[0.5, STRIPE_MID / h, 0.6, STRIPE_HALF / h]}
						id="mt-ad-m"
						stops={[
							[0.3, ink, 1],
							[0.72, ink, 0],
						]}
					/>
					<Mask id="mt-ad-mask">{fill("mt-ad-m")}</Mask>
				</>
			) : null}
		</Defs>
	);
}
