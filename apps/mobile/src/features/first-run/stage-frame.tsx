import type { ReactNode } from "react";
import { View } from "react-native";
import {
	SafeAreaInsetsContext,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { Stage } from "./first-run-motion";

/**
 * The virtual screen the first run draws on: the real screen on a phone (scale 1,
 * nothing moves), and on a tablet a smaller screen in board points scaled up about
 * its centre to cover the real one. Touches come back in its own points, and the
 * safe-area insets inside are divided by the scale to match.
 */
export function StageFrame({
	stage,
	children,
}: {
	stage: Stage;
	children: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const { s, W, H } = stage;
	const scaled =
		s === 1
			? insets
			: {
					bottom: insets.bottom / s,
					left: insets.left / s,
					right: insets.right / s,
					top: insets.top / s,
				};
	return (
		<SafeAreaInsetsContext.Provider value={scaled}>
			<View
				className="absolute"
				style={{
					height: H,
					left: (W * (s - 1)) / 2,
					top: (H * (s - 1)) / 2,
					transform: s === 1 ? undefined : [{ scale: s }],
					width: W,
				}}
			>
				{children}
			</View>
		</SafeAreaInsetsContext.Provider>
	);
}
