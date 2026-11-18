import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LAUNCH_COPY } from "./copy";
import { LAUNCH_TIMING } from "./launch-model";
import { useLaunchHold, useLaunchRevealed } from "./launch-store";

/**
 * In place of a loader: while the launch cover is up it holds the cover and draws nothing under
 * it. After launch (a bootstrap retry mid-session, the gate reloading, or the cover timing out)
 * it is a quiet loading state on the theme's background: a spinner, shown only if the wait runs
 * past `quietSpinnerAfterMs`, so a load that resolves at once shows nothing.
 */
export function LaunchHold({ reason }: { reason: string }) {
	useLaunchHold(true, reason);
	const revealed = useLaunchRevealed();
	return revealed ? <QuietLoading /> : null;
}

function QuietLoading() {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const id = setTimeout(
			() => setShown(true),
			LAUNCH_TIMING.quietSpinnerAfterMs
		);
		return () => clearTimeout(id);
	}, []);
	return (
		<View className="flex-1 items-center justify-center bg-background">
			{shown ? (
				<Animated.View entering={FadeIn}>
					<ActivityIndicator
						accessibilityLabel={LAUNCH_COPY.loading}
						colorClassName="accent-muted"
					/>
				</Animated.View>
			) : null}
		</View>
	);
}
