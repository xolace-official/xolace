// Lantern instrumentation (#416) in its own `library_*` namespace (#399).
// Reading is coarse on purpose: opened and finished, no scroll depth.
import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { PostHog } from "posthog-react-native";

import type { Kind } from "@/features/library/home/library-copy";

/** Where a reader open came from; a forgotten one lands as `unknown`. `today` has no surface
 * yet; `next` is Up next (#417). */
export type ReaderFrom =
	| "twig"
	| "home"
	| "hub"
	| "kind"
	| "subject"
	| "share"
	| "today"
	| "next"
	| "continue"
	| "search"
	| "unknown";

type Entry = { slug: string };

/** A Kindling twig's state, read off the backend so library never imports kindling. */
type TwigState = NonNullable<
	FunctionReturnType<typeof api.paths.getActive>
>["twigs"][number]["state"];

type LibraryEvents = {
	// Navigation (#409)
	library_home_opened: undefined;
	library_hub_opened: { hub: string };
	library_kind_opened: { kind: Kind };
	library_subject_opened: { subject: string };
	library_subjects_opened: { letter: string | null };
	// Reading funnel (#407, #410)
	library_entry_opened: Entry & { from: ReaderFrom };
	library_entry_finished: Entry; // by reading or by hearing the full audio
	library_entry_helped: Entry & { helped: boolean };
	library_entry_shared: Entry;
	library_reflect_started: Entry & { curated: boolean };
	// Audio (#411)
	library_audio_played: Entry & { preview: boolean };
	library_audio_preview_ended: Entry;
	library_audio_completed: Entry;
	// Paywall, paired
	library_paywall_shown: Entry & { trigger: "audio_preview" };
	library_paywall_tapped: Entry & { trigger: "audio_preview" };
	// Read twig (#412); its open is `library_entry_opened{from:'twig'}`
	library_twig_shown: Entry & { state: TwigState };
};

export function trackLibrary<E extends keyof LibraryEvents>(
	posthog: PostHog,
	event: E,
	...props: LibraryEvents[E] extends undefined ? [] : [LibraryEvents[E]]
) {
	posthog.capture(event, props[0]);
}
