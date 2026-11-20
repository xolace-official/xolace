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
	const loadMore = usePastEmptyPages(isSaved, saved);

	if (isSaved) {
		const waiting =
			saved.status === "LoadingFirstPage" ||
			(saved.results.length === 0 && saved.status !== "Exhausted");
		return {
			actions: { ...actions, loadMore },
			state: {
				canLoadMore: saved.status === "CanLoadMore",
				empty: COPY.lists.savedEmpty,
				from: "saved",
				items: waiting ? undefined : saved.results,
				loadingMore: saved.status === "LoadingMore",
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
			loadingMore: false,
			title: kind ? COPY.kinds[kind].label : facetLabel(subject ?? ""),
		},
	};
}

function usePastEmptyPages(
	on: boolean,
	saved: {
		results: readonly unknown[];
		status: string;
		loadMore: (n: number) => void;
	}
) {
	const askedAt = useRef<number | null>(0);
	const { results, status, loadMore } = saved;
	useEffect(() => {
		if (!on || status !== "CanLoadMore" || askedAt.current === null) {
			return;
		}
		if (results.length === askedAt.current) {
			loadMore(SAVED_PAGE);
		} else {
			askedAt.current = null;
		}
	}, [on, status, results.length, loadMore]);
	return () => {
		askedAt.current = results.length;
		loadMore(SAVED_PAGE);
	};
}

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, isPreview, posthog]);
}
