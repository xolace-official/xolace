import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import { type LaunchReplay, replayLaunch } from "./replay";

/**
 * A dev state's screen: replays the launch once on mount, then draws `children` (if any) as the
 * first screen. Children mount after the replay, so a hold they take counts.
 */
export function ReplayScreen({
	replay,
	children,
}: {
	replay: LaunchReplay;
	children?: ReactNode;
}) {
	const [replayed, setReplayed] = useState(false);
	useEffect(() => {
		replayLaunch(replay);
		setReplayed(true);
	}, [replay]);
	return (
		<View className="flex-1 bg-background">{replayed ? children : null}</View>
	);
}
