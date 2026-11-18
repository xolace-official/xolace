import { type Href, router } from "expo-router";
import { Uniwind } from "uniwind";
import { findVariant } from "@/design/themes";
import { useLaunch } from "@/features/launch/launch-store";

/**
 * One launch path, replayed without a cold start: the cover comes back up as on launch (in the
 * app's light or dark; a cold launch uses the phone's), the path's first screen goes in under it,
 * and the hold that loading would take lifts after `holdMs`.
 */
export type LaunchReplay = {
	/** What holds the cover, as the real step would (`gate`, `bootstrap`). */
	reason: string;
	/** How long that loading takes. Past `LAUNCH_TIMING.maxCoverMs` the cover leaves anyway. */
	holdMs: number;
	/** The first screen under the cover: `dismissTo` for a tab, `replace` for anything else. */
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
