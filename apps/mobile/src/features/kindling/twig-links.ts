import type { Href } from "expo-router";
import type { ActiveKindling, ServerTwig } from "./kindling-model";

type Params = { slug?: string; specialty?: string } | null;

/** The entry or track a twig points at, if it points at one. */
export const twigSlug = (twig: ServerTwig) => (twig.params as Params)?.slug;

/** "Browse more like this" (paths-v1 §9.6): the bound twig's topic in Browse. One-off
 * listening: no `stepId`, so plays can't tend the twig, and the binding is untouched. */
export function twigBrowseHref(twig: ServerTwig): Href | null {
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
		pathname: "/explore/topic/[slug]",
	};
}

/** Where the primary action goes: every twig hands off to its own screen. `stepId` rides
 * along so a natural finish tends the twig; a Browse play carries none (§9.6). */
export function twigHref(
	twig: ServerTwig,
	sessionId: ActiveKindling["sessionId"]
): Href | null {
	switch (twig.kind) {
		case "audio":
		case "music": {
			const slug = twigSlug(twig);
			return slug
				? { params: { slug, stepId: twig._id }, pathname: "/player" }
				: null;
		}
		case "read": {
			const slug = twigSlug(twig);
			return slug
				? {
						params: { from: "twig", slug, stepId: twig._id },
						pathname: "/library/[slug]",
					}
				: null;
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
			const specialty = (twig.params as Params)?.specialty;
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
