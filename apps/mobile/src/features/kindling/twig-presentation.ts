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

/** How each twig family reads on the card and the rail (docs/paths-v1.md §9.1).
 * Audio and music take the bound track's title; the fallback covers a retired track. */
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

/** "Browse more like this" (§9.6): the bound twig's topic in Browse. One-off
 * listening: no `stepId`, so plays can't tend the twig, and the binding is untouched. */
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

/** Where the primary action goes: every twig hands off to its own screen.
 * `stepId` rides along so a natural finish tends the twig; a Browse play carries none (§9.6). */
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
			return {
				params: { from: "kindling", sessionId, stepId: twig._id },
				pathname: "/sit-with-this",
			};
		case "bridge":
			return {
				params: { sessionId, stepId: twig._id },
				pathname: "/trusted-bridge",
			};
		case "xolacer": {
			// Only the ranker's specialty is stored, never a person (privacy, see
			// `ai/xolacers/suggest.sessionSuggestion`); the filtered roster is the fallback.
			const specialty = (twig.params as { specialty?: string } | null)
				?.specialty;
			// `t` makes a repeat tap re-apply the filter even when nothing else changed.
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
