import { achievementsScreens } from "@/features/achievements/screens";
import { careScreens } from "@/features/care/screens";
import { comingBackScreens } from "@/features/coming-back/screens";
import { connectScreens } from "@/features/connect/screens";
import { exploreScreens } from "@/features/explore/screens";
import { feedbackScreens } from "@/features/feedback/screens";
import { kindlingScreens } from "@/features/kindling/screens";
import { lanternScreens } from "@/features/lantern/screens";
import { lettersScreens } from "@/features/letters/screens";
import { navigationScreens } from "@/features/navigation/screens";
import { peerReflectionScreens } from "@/features/peer-reflection/screens";
import { playerScreens } from "@/features/player/screens";
import { purchasesScreens } from "@/features/purchases/screens";
import { quotesScreens } from "@/features/quotes/screens";
import { ratingsScreens } from "@/features/ratings/screens";
import { reflectScreens } from "@/features/reflect/screens";
import { sessionEndScreens } from "@/features/session-end/screens";
import { sitWithThisScreens } from "@/features/sit-with-this/screens";
import { talkScreens } from "@/features/talk/screens";
import { ventScreens } from "@/features/vent/screens";
import { xolacerChatScreens } from "@/features/xolacer-chat/screens";
import { youScreens } from "@/features/you/screens";
import type { RootScreen } from "@/lib/root-screen";

export const ROOT_SCREENS: readonly RootScreen[] = [
	...achievementsScreens,
	...careScreens,
	...comingBackScreens,
	...connectScreens,
	...exploreScreens,
	...feedbackScreens,
	...kindlingScreens,
	...lanternScreens,
	...lettersScreens,
	...navigationScreens,
	...peerReflectionScreens,
	...playerScreens,
	...purchasesScreens,
	...quotesScreens,
	...ratingsScreens,
	...reflectScreens,
	...sessionEndScreens,
	...sitWithThisScreens,
	...talkScreens,
	...ventScreens,
	...xolacerChatScreens,
	...youScreens,
];
