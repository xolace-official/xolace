import { Pressable } from "react-native";
import { Icon } from "@/components/shared/icon";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { P } from "../player-metrics";
import { PlayerGlass } from "./player-glass";

const GLASS = {
	alignItems: "center",
	borderCurve: "continuous",
	borderRadius: P.glass / 2,
	height: P.glass,
	justifyContent: "center",
	width: P.glass,
} as const;

/** The 44 pt glass chevron, top left. */
export function CloseButton({ top }: { top: number }) {
	const { actions } = usePlayer();
	const ink = useTokenColor("player-ink");
	return (
		<Pressable
			accessibilityLabel={PLAYER_COPY.close}
			accessibilityRole="button"
			className="absolute"
			hitSlop={8}
			onPress={() => {
				playSoftPress();
				actions.close();
			}}
			style={{ left: P.glassSide, top }}
		>
			<PlayerGlass style={GLASS}>
				<Icon
					color={ink}
					name={{ android: "keyboard_arrow_down", ios: "chevron.down" }}
					size={18}
					weight="semibold"
				/>
			</PlayerGlass>
		</Pressable>
	);
}
