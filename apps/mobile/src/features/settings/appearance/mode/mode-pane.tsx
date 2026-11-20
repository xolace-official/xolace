import { View } from "react-native";
import Svg, { ClipPath, Defs, G, Polygon, Rect } from "react-native-svg";
import { ScopedTheme } from "uniwind";
import { themeVariant } from "@/design/themes";
import type { ThemeMode } from "@/features/settings/appearance/appearance-model";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";

const W = 72;
const H = 118;
const RADIUS = 14;
const RING_ON = 2;
const RING_OFF = 1;
const PAD = 7;
const LINE_LONG = W - 21;
const LINE_SHORT = W - 33;

const DEFAULT_LIGHT = themeVariant("default", "light");
const DEFAULT_DARK = themeVariant("default", "dark");

function PaneSvg({ half = false }: { half?: boolean }) {
	const [background, surface, accent, ink] = useTokenColors([
		"background",
		"surface",
		"accent",
		"foreground",
	]);
	return (
		<Svg
			height={H}
			style={half ? { left: 0, position: "absolute", top: 0 } : undefined}
			width={W}
		>
			<Defs>
				<ClipPath id="mode-half">
					<Polygon points={`${W},0 ${W},${H} 0,${H}`} />
				</ClipPath>
			</Defs>
			<G clipPath={half ? "url(#mode-half)" : undefined}>
				<Rect fill={background} height={H} width={W} x={0} y={0} />
				<Rect
					fill={surface}
					height={28}
					rx={7}
					width={W - 2 * PAD}
					x={PAD}
					y={22}
				/>
				<Rect fill={accent} height={6} rx={3} width={26} x={PAD} y={58} />
				<Rect
					fill={ink}
					fillOpacity={0.22}
					height={4}
					rx={2}
					width={LINE_LONG}
					x={PAD}
					y={70}
				/>
				<Rect
					fill={ink}
					fillOpacity={0.22}
					height={4}
					rx={2}
					width={LINE_SHORT}
					x={PAD}
					y={79}
				/>
			</G>
		</Svg>
	);
}

export function ModePane({ mode, on }: { mode: ThemeMode; on: boolean }) {
	const ring = on ? RING_ON : RING_OFF;
	return (
		<View style={{ height: H, width: W }}>
			<View
				className="overflow-hidden border-continuous"
				style={{ borderRadius: RADIUS, height: H, width: W }}
			>
				<ScopedTheme theme={mode === "dark" ? DEFAULT_DARK : DEFAULT_LIGHT}>
					<PaneSvg />
				</ScopedTheme>
				{mode === "system" ? (
					<ScopedTheme theme={DEFAULT_DARK}>
						<PaneSvg half />
					</ScopedTheme>
				) : null}
			</View>
			<View
				className={cn(
					"absolute border-continuous",
					on ? "border-accent" : "border-separator"
				)}
				pointerEvents="none"
				style={{
					borderRadius: RADIUS + ring,
					borderWidth: ring,
					bottom: -ring,
					left: -ring,
					right: -ring,
					top: -ring,
				}}
			/>
		</View>
	);
}
