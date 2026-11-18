import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";

/** Production's arc glyphs, `gobackward.15` / `goforward.15` (Android draws the board's SVG,
 * `skip-glyph.android.tsx`). */
export function SkipGlyph({ dir, size }: { dir: -1 | 1; size: number }) {
	const ink = useTokenColor("player-ink");
	return (
		<Icon
			color={ink}
			name={dir < 0 ? "gobackward.15" : "goforward.15"}
			size={size}
			weight="regular"
		/>
	);
}
