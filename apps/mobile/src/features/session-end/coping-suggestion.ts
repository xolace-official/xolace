import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";

export type CopingStyle = NonNullable<
	Doc<"intake_responses">["copingStyle"]
>[number];

/** The Browse shelves a coping answer can point at (`/browse/list?family=…`). */
export type BrowseFamily = "support" | "music";

/** Same entry points as the Browse hub's tiles. */
export const BROWSE_HREF: Record<BrowseFamily, Href> = {
	music: "/browse/list?family=music",
	support: "/browse/list?family=support",
};

export type CopingSuggestion =
	| { kind: "kindling" }
	| { kind: "browse"; family: BrowseFamily };

/**
 * What session end suggests under "What usually helps after?" (#712). Someone who
 * settles with something calming or a distraction gets a Browse shelf; everyone
 * else keeps today's Kindling slot, which carries the session into support.
 */
export function copingSuggestion(answer: CopingStyle): CopingSuggestion {
	switch (answer) {
		case "calming_creative":
			return { family: "support", kind: "browse" };
		case "distract":
			return { family: "music", kind: "browse" };
		default:
			return { kind: "kindling" };
	}
}
