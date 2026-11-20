import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useTokenColor } from "@/lib/use-token-color";
import type { WhatsNewItem } from "../copy";

/** The canvas's 48 pt tile: ember for letters, violet for the rest; 24 pt line icons, 1.8 stroke. */
const TILE = 48;
const TILE_RADIUS = 14;
const GLYPH = 24;
const STROKE = 1.8;

function Glyph({ icon }: Pick<WhatsNewItem, "icon">) {
	if (icon === "letters") {
		return (
			<>
				<Rect height={14} rx={2.5} width={18} x={3} y={5} />
				<Path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
			</>
		);
	}
	if (icon === "captions") {
		return <Path d="M4 6.5h16M4 11.5h11M4 16.5h7" />;
	}
	return (
		<Path d="M5 17.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v6a2.5 2.5 0 0 1-2.5 2.5H9z" />
	);
}

export function WhatsNewIcon({
	icon,
	tone,
}: Pick<WhatsNewItem, "icon" | "tone">) {
	const ink = useTokenColor(tone === "ember" ? "ember-ink" : "accent-ink");
	return (
		<View
			className={tone === "ember" ? "bg-ember-wash" : "bg-accent-wash"}
			style={{
				alignItems: "center",
				borderCurve: "continuous",
				borderRadius: TILE_RADIUS,
				height: TILE,
				justifyContent: "center",
				width: TILE,
			}}
		>
			<Svg
				fill="none"
				height={GLYPH}
				stroke={ink}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={STROKE}
				viewBox="0 0 24 24"
				width={GLYPH}
			>
				<Glyph icon={icon} />
			</Svg>
		</View>
	);
}
