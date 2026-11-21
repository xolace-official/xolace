import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { LIBRARY_HELPED_FLOOR } from "@xolace/backend/shared";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useIsPreview } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { dwellLeft } from "@/features/lantern/reader/reader-model";
import { useConnected } from "@/features/lantern/reader/use-connected";
import { type ReaderFrom, trackLibrary } from "@/lib/library-analytics";

type EntryId = Id<"library_entries">;

export const logDropped = (e: unknown) =>
	console.warn("[lantern] read signal dropped:", e);

const TEND_ATTEMPTS = 3;

const nudgeHelped = (count: number | null, was: boolean, now?: boolean) => {
	if (count === null || now === undefined || now === was) {
		return count;
	}
	const next = count + (now ? 1 : -1);
	return next >= LIBRARY_HELPED_FLOOR ? next : null;
};

export function useRecord() {
	return useMutation(api.library.reads.record).withOptimisticUpdate(
		(store, args) => {
			const ref = api.library.reads.getReaderState;
			const cur = store.getQuery(ref, { entryId: args.entryId });
			if (!cur) {
				return;
			}
			store.setQuery(
				ref,
				{ entryId: args.entryId },
				{
					...cur,
					helped: args.helped ?? cur.helped,
					helpedCount: nudgeHelped(cur.helpedCount, cur.helped, args.helped),
					saved: args.saved ?? cur.saved,
				}
			);
		}
	);
}

export function useReadSignals(n: {
	entryId: EntryId;
	slug: string;
	readMin: number;
	from?: ReaderFrom;
	stepId?: Id<"path_steps">;
}) {
	const { entryId, slug, readMin, from, stepId } = n;
	const record = useMutation(api.library.reads.record);
	const state = useQuery(api.library.reads.getReaderState, { entryId });
	const [openedAt] = useState(() => Date.now());
	const [reachedEnd, setReachedEnd] = useState(false);
	const posthog = usePostHog();
	const { isAuthenticated } = useConvexAuth();
	const isPreview = useIsPreview();
	const convex = useConvex();

	const trackedFor = useRef<EntryId | null>(null);
	useEffect(() => {
		if (isPreview || trackedFor.current === entryId) {
			return;
		}
		trackedFor.current = entryId;
		trackLibrary(posthog, "library_entry_opened", {
			from: from ?? "unknown",
			slug,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entryId, isPreview]);

	const openedFor = useRef<EntryId | null>(null);
	useEffect(() => {
		if (isPreview || openedFor.current === entryId || !isAuthenticated) {
			return;
		}
		openedFor.current = entryId;
		record({ entryId, opened: true }).catch((e) => {
			openedFor.current = null;
			logDropped(e);
		});
	}, [record, entryId, isAuthenticated, isPreview]);

	const finished = state?.finished;
	useEffect(() => {
		if (isPreview || !reachedEnd || finished !== false || !isAuthenticated) {
			return;
		}
		const t = setTimeout(
			() => record({ entryId, finished: true }).catch(logDropped),
			dwellLeft(openedAt, readMin, Date.now())
		);
		return () => clearTimeout(t);
	}, [
		reachedEnd,
		finished,
		isAuthenticated,
		isPreview,
		openedAt,
		readMin,
		record,
		entryId,
	]);

	const wasFinished = useRef(finished);
	useEffect(() => {
		if (!isPreview && wasFinished.current === false && finished === true) {
			trackLibrary(posthog, "library_entry_finished", { slug });
		}
		wasFinished.current = finished;
	}, [finished, posthog, slug, isPreview]);

	const completeStep = useMutation(api.paths.completeStep);
	const connected = useConnected();
	const tended = useRef(false);
	const tendAttempts = useRef(0);
	useEffect(() => {
		if (
			isPreview ||
			!stepId ||
			finished !== true ||
			tended.current ||
			!connected ||
			!isAuthenticated ||
			tendAttempts.current >= TEND_ATTEMPTS
		) {
			return;
		}
		tended.current = true;
		tendAttempts.current += 1;
		completeStep({ stepId }).catch((e) => {
			tended.current = false;
			console.error("[lantern] completeStep failed:", e);
		});
	}, [stepId, finished, completeStep, connected, isAuthenticated, isPreview]);

	return {
		leaveAt: (share: number | null) => {
			// Losing auth unmounts the reader before it re-renders, so `isAuthenticated` is stale
			// here; `sync` is @internal to convex/react (1.45).
			const { sync } = convex as unknown as { sync: { hasAuth(): boolean } };
			if (isPreview || share === null || !sync.hasAuth()) {
				return;
			}
			record({ entryId, position: share }).catch(logDropped);
		},
		reachEnd: () => setReachedEnd(true),
		state,
	};
}
