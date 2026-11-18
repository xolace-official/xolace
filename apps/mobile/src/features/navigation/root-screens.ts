import { browseScreens } from "@/features/browse/screens";
import { careScreens } from "@/features/care/screens";
import { connectScreens } from "@/features/connect/screens";
import { followUpScreens } from "@/features/follow-up/screens";
import { intakeScreens } from "@/features/intake/screens";
import { kindlingScreens } from "@/features/kindling/screens";
import { lanternScreens } from "@/features/lantern/screens";
import { navigationScreens } from "@/features/navigation/screens";
import { peerReflectionScreens } from "@/features/peer-reflection/screens";
import { playerScreens } from "@/features/player/screens";
import { purchasesScreens } from "@/features/purchases/screens";
import { quotesScreens } from "@/features/quotes/screens";
import { reflectScreens } from "@/features/reflect/screens";
import { sessionEndScreens } from "@/features/session-end/screens";
import { sitWithThisScreens } from "@/features/sit-with-this/screens";
import { streakScreens } from "@/features/streak/screens";
import { talkScreens } from "@/features/talk/screens";
import { ventScreens } from "@/features/vent/screens";
import { xolacerChatScreens } from "@/features/xolacer-chat/screens";
import { youScreens } from "@/features/you/screens";
import type { RootScreen } from "@/lib/root-screen";

/**
 * Every screen in the `(protected)` stack besides `index` and `(tabs)`, which the
 * layout lists first, and `dev` (`src/dev`), which it lists last, under
 * `__DEV__`. A feature adds its entries to its own `screens.ts`, and only a new
 * feature adds a line here (one import, one spread, alphabetical).
 */
export const ROOT_SCREENS: readonly RootScreen[] = [
	...browseScreens,
	...careScreens,
	...connectScreens,
	...followUpScreens,
	...intakeScreens,
	...kindlingScreens,
	...lanternScreens,
	...navigationScreens,
	...peerReflectionScreens,
	...playerScreens,
	...purchasesScreens,
	...quotesScreens,
	...reflectScreens,
	...sessionEndScreens,
	...sitWithThisScreens,
	...streakScreens,
	...talkScreens,
	...ventScreens,
	...xolacerChatScreens,
	...youScreens,
];
