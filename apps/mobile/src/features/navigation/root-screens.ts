import { achievementsScreens } from "@/features/achievements/screens";
import { browseScreens } from "@/features/browse/screens";
import { crisisResourcesScreens } from "@/features/crisis-resources/screens";
import { followUpScreens } from "@/features/follow-up/screens";
import { insightsScreens } from "@/features/insights/screens";
import { intakeScreens } from "@/features/intake/screens";
import { kindlingScreens } from "@/features/kindling/screens";
import { libraryScreens } from "@/features/library/screens";
import { peerReflectionScreens } from "@/features/peer-reflection/screens";
import { purchasesScreens } from "@/features/purchases/screens";
import { quotesScreens } from "@/features/quotes/screens";
import { sessionEndScreens } from "@/features/session-end/screens";
import { sitWithThisScreens } from "@/features/sit-with-this/screens";
import { streakScreens } from "@/features/streak/screens";
import { trustedBridgeScreens } from "@/features/trusted-bridge/screens";
import { ventScreens } from "@/features/vent/screens";
import { xolacerChatScreens } from "@/features/xolacer-chat/screens";
import type { Shell } from "@/lib/redesign/shell-gate";
import type { RootScreen } from "@/lib/root-screen";

/**
 * Every screen in the `(protected)` stack besides `index` and `(tabs)`, which the
 * layout lists first. A feature adds its entries to its own `screens.ts`, and
 * only a new feature adds a line here (one import, one spread, alphabetical).
 * The layout takes them through `rootScreensFor`.
 */
export const ROOT_SCREENS: readonly RootScreen[] = [
	...achievementsScreens,
	...browseScreens,
	...crisisResourcesScreens,
	...followUpScreens,
	...insightsScreens,
	...intakeScreens,
	...kindlingScreens,
	...libraryScreens,
	...peerReflectionScreens,
	...purchasesScreens,
	...quotesScreens,
	...sessionEndScreens,
	...sitWithThisScreens,
	...streakScreens,
	...trustedBridgeScreens,
	...ventScreens,
	...xolacerChatScreens,
];

/**
 * The entries `shell` lists: the old shell leaves out every `shell: "v2"` entry;
 * the v2 shell lists them in place of the entry of the same name, so a v2 screen
 * takes over an old route (and its presentation) from its own `screens.ts`.
 */
export function rootScreensFor(
	shell: Shell,
	screens: readonly RootScreen[] = ROOT_SCREENS
): RootScreen[] {
	if (shell === "v1") {
		return screens.filter((screen) => screen.shell !== "v2");
	}
	const taken = new Set(
		screens.filter((screen) => screen.shell === "v2").map((s) => s.name)
	);
	return screens.filter(
		(screen) => screen.shell === "v2" || !taken.has(screen.name)
	);
}
