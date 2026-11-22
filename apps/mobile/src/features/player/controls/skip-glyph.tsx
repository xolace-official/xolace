import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";

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
