import { type Href, router } from "expo-router";
import { Uniwind } from "uniwind";
import { findVariant } from "@/design/themes";
import type { HoldReason } from "@/features/launch/launch-model";
import { useLaunch } from "@/features/launch/launch-store";

export type LaunchReplay = {
	reason: HoldReason;
	holdMs: number;
	under?: { dismissTo: Href } | { replace: Href };
};

export function replayLaunch({ reason, holdMs, under }: LaunchReplay): void {
	const launch = useLaunch.getState();
	launch.replay(findVariant(Uniwind.currentTheme)?.base ?? "light");
	const release = launch.hold(reason);
	if (under && "dismissTo" in under) {
		router.dismissTo(under.dismissTo);
	} else if (under) {
		router.replace(under.replace);
	}
	setTimeout(release, holdMs);
}
