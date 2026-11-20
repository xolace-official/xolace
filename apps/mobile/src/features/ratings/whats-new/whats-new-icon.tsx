import { View } from "react-native";
import { Icon } from "@/components/shared/icon";
import type { ReleaseNote } from "@/lib/release-notes";
import { useTokenColor } from "@/lib/use-token-color";

const TILE = 48;
const TILE_RADIUS = 14;
const GLYPH = 22;

export function WhatsNewIcon({
	icon,
	tone,
}: Pick<ReleaseNote, "icon" | "tone">) {
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
			<Icon color={ink} name={icon} size={GLYPH} weight="regular" />
		</View>
	);
}
