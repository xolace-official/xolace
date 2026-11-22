import type { TalkLook } from "@xolace/backend/convex/lib/voices";

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

export function lookOf(name: string | undefined): TalkLook {
	return TALK_LOOKS.find((look) => look === name) ?? DEFAULT_LOOK;
}
