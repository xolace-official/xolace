import type { Href } from "expo-router";
import {
	type ActiveKindling,
	BROWSABLE,
	type ServerTwig,
} from "./kindling-model";

type Params = { slug?: string; specialty?: string } | null;

export const twigSlug = (twig: ServerTwig) => (twig.params as Params)?.slug;

export function twigBrowseHref(twig: ServerTwig): Href | null {
	const match = BROWSABLE.exec(twig.actionType);
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
			const specialty = (twig.params as Params)?.specialty;
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
