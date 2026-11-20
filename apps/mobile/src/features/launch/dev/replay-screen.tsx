import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import { type LaunchReplay, replayLaunch } from "./replay";

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
