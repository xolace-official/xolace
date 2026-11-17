import { browseScreens } from "@/features/browse/screens";
import { crisisResourcesScreens } from "@/features/crisis-resources/screens";
import { followUpScreens } from "@/features/follow-up/screens";
import { insightsScreens } from "@/features/insights/screens";
import { intakeScreens } from "@/features/intake/screens";
import { kindlingScreens } from "@/features/kindling/screens";
import { lanternScreens } from "@/features/lantern/screens";
import { libraryScreens } from "@/features/library/screens";
import { navigationScreens } from "@/features/navigation/screens";
import { peerReflectionScreens } from "@/features/peer-reflection/screens";
import { purchasesScreens } from "@/features/purchases/screens";
import { quotesScreens } from "@/features/quotes/screens";
import { sessionEndScreens } from "@/features/session-end/screens";
import { sitWithThisScreens } from "@/features/sit-with-this/screens";
import { streakScreens } from "@/features/streak/screens";
import { talkScreens } from "@/features/talk/screens";
import { trustedBridgeScreens } from "@/features/trusted-bridge/screens";
import { ventScreens } from "@/features/vent/screens";
import { xolacerChatScreens } from "@/features/xolacer-chat/screens";
import type { RootScreen } from "@/lib/root-screen";

/**
 * Every screen in the `(protected)` stack besides `index` and `(tabs)`, which the
 * layout lists first, and `dev` (`src/dev`), which it lists last, under
 * `__DEV__`. A feature adds its entries to its own `screens.ts`, and only a new
 * feature adds a line here (one import, one spread, alphabetical).
 */
export const ROOT_SCREENS: readonly RootScreen[] = [
	...browseScreens,
	...crisisResourcesScreens,
	...followUpScreens,
	...insightsScreens,
	...intakeScreens,
	...kindlingScreens,
	...lanternScreens,
	...libraryScreens,
	...navigationScreens,
	...peerReflectionScreens,
	...purchasesScreens,
	...quotesScreens,
	...sessionEndScreens,
	...sitWithThisScreens,
	...streakScreens,
	...talkScreens,
	...trustedBridgeScreens,
	...ventScreens,
	...xolacerChatScreens,
];
