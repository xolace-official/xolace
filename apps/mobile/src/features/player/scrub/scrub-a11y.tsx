import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { PLAYER_COPY } from "../copy";
import { usePlayer, usePlayerClock } from "../player-data";
import { positionVo } from "../player-format";

const STEP_S = 15;

/**
 * The scrubber for VoiceOver: adjustable, ±15 s, "3 minutes 6 seconds of 8 minutes 12 seconds".
 * Only this wrapper renders on the clock's tick; the bars inside are the same element.
 */
export function ScrubA11y({
	style,
	children,
}: {
	style: ViewStyle;
	children: ReactNode;
}) {
	const { position, duration } = usePlayerClock();
	const { actions } = usePlayer();
	return (
		<View
			accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
			accessibilityLabel={PLAYER_COPY.position}
			accessibilityRole="adjustable"
			accessibilityValue={{ text: positionVo(position, duration) }}
			accessible
			className="absolute"
			onAccessibilityAction={(e) =>
				actions.skip(
					e.nativeEvent.actionName === "increment" ? STEP_S : -STEP_S
				)
			}
			style={style}
		>
			{children}
		</View>
	);
}
