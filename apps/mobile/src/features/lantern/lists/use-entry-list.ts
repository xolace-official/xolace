/**
 * The list screen's data hook: a kind or a subject (`listEntries`, the first 50, as production),
 * or Saved (`listSaved`, newest saved first, paged), with each open counted once.
 */
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { useIsPreview } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { COPY } from "@/features/lantern/copy";
import { facetLabel, type Kind } from "@/features/lantern/lantern-model";
import type { EntryList } from "@/features/lantern/lists/list-data";
import { useEntryActions } from "@/features/lantern/use-entry-actions";
import { useStablePaginatedQuery } from "@/lib/convex/use-stable-query";
import { trackLibrary } from "@/lib/library-analytics";

export type ListOf = { kind: Kind } | { subject: string } | { saved: true };

/** Saved arrives a page at a time; a page fills the screen and some. */
const SAVED_PAGE = 30;

export function useEntryList(of: ListOf): EntryList {
	const actions = useEntryActions();
	const kind = "kind" in of ? of.kind : undefined;
	const subject = "subject" in of ? of.subject : undefined;
	const isSaved = "saved" in of;
	const entries = useQuery(
		api.library.entries.listEntries,
		isSaved ? "skip" : { kind, subject }
	);
	const saved = useStablePaginatedQuery(
		api.library.reads.listSaved,
		isSaved ? {} : "skip",
		{ initialNumItems: SAVED_PAGE }
	);
	useOpened(of);

	if (isSaved) {
		return {
			actions: { ...actions, loadMore: () => saved.loadMore(SAVED_PAGE) },
			state: {
				canLoadMore: saved.status === "CanLoadMore",
				empty: COPY.lists.savedEmpty,
				from: "saved",
				items: saved.status === "LoadingFirstPage" ? undefined : saved.results,
				title: COPY.lists.saved,
			},
		};
	}
	return {
		actions: { ...actions, loadMore: () => undefined },
		state: {
			canLoadMore: false,
			empty: COPY.lists.empty,
			from: kind ? "kind" : "subject",
			items: entries,
			title: kind ? COPY.kinds[kind].label : facetLabel(subject ?? ""),
		},
	};
}

/** Once per list; a long-press preview counts once it becomes the real screen. */
function useOpened(of: ListOf) {
	const posthog = usePostHog();
	const isPreview = useIsPreview();
	const key = "kind" in of ? of.kind : "subject" in of ? of.subject : "saved";
	const trackedFor = useRef<string | null>(null);
	useEffect(() => {
		if (isPreview || trackedFor.current === key) {
			return;
		}
		trackedFor.current = key;
		if ("kind" in of) {
			trackLibrary(posthog, "library_kind_opened", { kind: of.kind });
		} else if ("subject" in of) {
			trackLibrary(posthog, "library_subject_opened", { subject: of.subject });
		} else {
			trackLibrary(posthog, "library_saved_opened");
		}
		// `of` is fixed for a mounted list; `key` names it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, isPreview, posthog]);
}
