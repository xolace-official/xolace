import type { api } from "@xolace/backend/api";
import type { Doc } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import type { PostHog } from "posthog-react-native";

type Kind = Doc<"library_entries">["kind"];

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
	| "saved"
	| "search"
	| "explore"
	| "unknown";

type Entry = { slug: string };

type TwigState = NonNullable<
	FunctionReturnType<typeof api.paths.getActive>
>["twigs"][number]["state"];

type LibraryEvents = {
	library_home_opened: undefined;
	library_hub_opened: { hub: string };
	library_kind_opened: { kind: Kind };
	library_subject_opened: { subject: string };
	library_subjects_opened: { letter: string | null };
	library_saved_opened: undefined;
	library_entry_opened: Entry & { from: ReaderFrom };
	library_entry_finished: Entry;
	library_entry_helped: Entry & { helped: boolean };
	library_resume_tapped: Entry;
	library_entry_shared: Entry;
	library_reflect_started: Entry & { curated: boolean };
	library_audio_played: Entry & { preview: boolean };
	library_audio_preview_ended: Entry;
	library_audio_completed: Entry;
	library_paywall_shown: Entry & { trigger: "audio_preview" };
	library_paywall_tapped: Entry & { trigger: "audio_preview" };
	library_twig_shown: Entry & { state: TwigState };
};

export function trackLibrary<E extends keyof LibraryEvents>(
	posthog: PostHog,
	event: E,
	...props: LibraryEvents[E] extends undefined ? [] : [LibraryEvents[E]]
) {
	posthog.capture(event, props[0]);
}
