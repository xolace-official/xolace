import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LAUNCH_COPY } from "./copy";
import { holdShows, waitForQuietSpinner } from "./launch-clock";
import type { HoldReason } from "./launch-model";
import { useLaunchHold, useLaunchRevealed } from "./launch-store";

export function LaunchHold({ reason }: { reason: HoldReason }) {
	useLaunchHold(true, reason);
	const revealed = useLaunchRevealed();
	const [spinnerDue, setSpinnerDue] = useState(false);
	useEffect(() => {
		if (revealed) {
			return waitForQuietSpinner(() => setSpinnerDue(true));
		}
	}, [revealed]);
	const shows = holdShows(revealed, spinnerDue);
	if (shows === "nothing") {
		return null;
	}
	return (
		<View className="flex-1 items-center justify-center bg-background">
			{shows === "spinner" ? (
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
