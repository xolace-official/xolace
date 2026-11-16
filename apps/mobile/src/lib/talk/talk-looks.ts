// The companion's looks a preference may name (`preferences.talkLook`). A preference keeps
// only the name; how each one is drawn is Talk's (`features/talk/companion-look.ts`).

import type { TalkLook } from "@xolace/backend/convex/lib/voices";

/** Every look this build knows, in the order Talk's carousel shows them. */
export const TALK_LOOKS: readonly TalkLook[] = [
	"xolace",
	"tide",
	"moss",
	"dusk",
	"ember",
	"theme",
	"chalk",
];

const DEFAULT_LOOK: TalkLook = "xolace";

/** A saved look this build doesn't know (one added after it shipped) shows as the default. */
export function lookOf(name: string | undefined): TalkLook {
	return TALK_LOOKS.find((look) => look === name) ?? DEFAULT_LOOK;
}
