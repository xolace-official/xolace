/**
 * Where Lantern's screens live. The paths keep production's "library" names: shipped builds,
 * shares (`xolace://library/<slug>`) and notification payloads open them. The client feature is
 * Lantern; the routes and the Convex namespace stay `library`.
 */
import type { Href } from "expo-router";
import type { Kind } from "@/features/lantern/lantern-model";
import type { ReaderFrom } from "@/lib/library-analytics";

export type { ReaderFrom };

/** The reader. `hub` rides along from a hub so Up next follows its order (#417). */
export const readerHref = (slug: string, from: ReaderFrom, hub?: string) =>
	({
		params: { from, slug, ...(hub ? { hub } : {}) },
		pathname: "/library/[slug]",
	}) as const;

export const hubHref = (slug: string) =>
	({ params: { slug }, pathname: "/explore/library/hub/[slug]" }) as const;
export const kindHref = (kind: Kind) =>
	({ params: { kind }, pathname: "/explore/library/kind/[kind]" }) as const;
export const subjectHref = (slug: string) =>
	({ params: { slug }, pathname: "/explore/library/subject/[slug]" }) as const;
export const subjectsHref = (letter?: string) =>
	({
		params: letter ? { letter } : {},
		pathname: "/explore/library/subjects",
	}) as const;
export const SAVED_HREF: Href = "/explore/library/saved";
export const WELCOME_HREF: Href = "/lantern-welcome";
