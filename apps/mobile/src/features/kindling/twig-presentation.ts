import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Href } from "expo-router";
import type { SymbolViewProps } from "expo-symbols";

export type Kindling = NonNullable<
	FunctionReturnType<typeof api.paths.getActive>
>;
export type Twig = Kindling["twigs"][number];

const BREATHING_IMAGE =
	"https://energetic-guineapig-283.convex.cloud/api/storage/6d4d937e-8dd9-4e8d-bbd6-3ee58b538988";

/**
 * How each twig family reads on the card and the rail (docs/paths-v1.md
 * §9.1). Audio and music take the bound track's title when the server could
 * resolve one; the fallback covers a retired track.
 */
export const TWIG_PRESENTATION: Record<
	Twig["kind"],
	{
		symbol: SymbolViewProps["name"];
		eyebrow: string;
		title: string;
		actionLabel: string;
		image: string;
	}
> = {
	audio: {
		actionLabel: "Play",
		eyebrow: "Something to hear",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/be99df4e-7738-4cf8-9384-8cabae5a476e",
		symbol: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" },
		title: "A voice for this",
	},
	breathing: {
		actionLabel: "Begin",
		eyebrow: "A few minutes",
		image: BREATHING_IMAGE,
		symbol: { android: "air", ios: "wind", web: "air" },
		title: "Sit with this",
	},
	bridge: {
		actionLabel: "Write",
		eyebrow: "When you're ready",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/8f7dc3c4-9caa-4744-b3bf-2393b572a1e9",
		symbol: { android: "mail", ios: "envelope", web: "mail" },
		title: "Tell someone you trust",
	},
	music: {
		actionLabel: "Play",
		eyebrow: "Something to hear",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/91ae3a04-e554-431a-b2e0-e4c46191cf76",
		symbol: { android: "music_note", ios: "music.note", web: "music_note" },
		title: "Low sound for the quiet",
	},
	read: {
		actionLabel: "Read",
		eyebrow: "Something to read",
		// Borrows breathing's until read has an image of its own.
		image: BREATHING_IMAGE,
		symbol: { android: "menu_book", ios: "book", web: "menu_book" },
		title: "A few pages for this",
	},
	// Off-app (#567): no screen to hand off to, so the action is the person saying they did it.
	try: {
		actionLabel: "I did this",
		eyebrow: "Away from the app",
		// Borrows breathing's until try-this has an image of its own.
		image: BREATHING_IMAGE,
		symbol: {
			android: "directions_walk",
			ios: "figure.walk",
			web: "directions_walk",
		},
		title: "Something to try",
	},
	xolacer: {
		actionLabel: "See who",
		eyebrow: "When you want it",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/6642efe2-7add-4a87-91d8-70f547ada414",
		symbol: { android: "group", ios: "person.2", web: "group" },
		title: "Someone who has been here",
	},
};

/**
 * "Browse more like this" (§9.6): a bound audio/music twig's topic in Browse,
 * filtered to its family. One-off listening — nothing here carries `stepId`,
 * so plays from it can't tend the twig, and the stored binding is never
 * touched. If the bound track is wrong, "Not for me" is the correction.
 */
export function twigBrowseHref(twig: Twig): Href | null {
	const match = /^(audio|music)_topic_(.+)$/.exec(twig.actionType);
	if (!match) {
		return null;
	}
	return {
		params: {
			family: match[1] === "music" ? "music" : "support",
			from: "twig-more-like-this",
			slug: match[2],
		},
		pathname: "/browse/topic/[slug]",
	};
}

/**
 * Where the primary action goes. Every twig hands off to a screen of its own
 * (the person is chosen there, the exercise runs there); this screen never
 * plays or runs anything inline.
 *
 * Audio and music go to the one player (#340, `/browse-player`). `stepId`
 * rides along so `useTrackPlayback` tends the twig on a natural finish —
 * a Browse play carries no `stepId` and never completes anything (§9.6).
 */
/** The entry or track a twig points at, if it points at one. */
export const twigSlug = (twig: Twig) =>
	(twig.params as { slug?: string } | null)?.slug;

export function twigHref(
	twig: Twig,
	sessionId: Kindling["sessionId"]
): Href | null {
	switch (twig.kind) {
		case "audio":
		case "music": {
			const slug = (twig.params as { slug?: string } | null)?.slug;
			if (!slug) {
				return null;
			}
			return { params: { slug, stepId: twig._id }, pathname: "/browse-player" };
		}
		case "read": {
			// `stepId` rides along so the reader tends the twig once the entry is finished.
			const slug = twigSlug(twig);
			if (!slug) {
				return null;
			}
			return {
				params: { from: "twig", slug, stepId: twig._id },
				pathname: "/library/[slug]",
			};
		}
		case "breathing":
			// `stepId` rides along so finishing the exercise tends the twig.
			return {
				params: { from: "kindling", sessionId, stepId: twig._id },
				pathname: "/sit-with-this",
			};
		case "bridge":
			// `stepId` rides along so a completed share tends the twig.
			return {
				params: { sessionId, stepId: twig._id },
				pathname: "/trusted-bridge",
			};
		case "xolacer": {
			// Only the ranker's specialty is stored — never a person (privacy, see
			// `ai/xolacers/suggest.sessionSuggestion`). The roster filtered to it is
			// the fallback when no one is suggested (`use-xolacer-twig-href.ts`).
			const specialty = (twig.params as { specialty?: string } | null)
				?.specialty;
			// `t` makes a repeat tap re-apply the filter even when nothing else changed.
			// `stepId` rides along to the profile so a sent request tends the twig.
			return {
				params: {
					stepId: twig._id,
					t: String(Date.now()),
					...(specialty ? { specialty } : {}),
				},
				pathname: "/connect",
			};
		}
		default:
			return null;
	}
}
