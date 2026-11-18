import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { useSessionMode } from "@/context/session-mode-context";
import { goHome } from "@/lib/landing";
import { useSessionEndHref } from "@/lib/path-session/session-end-href";
import { usePathSession } from "@/lib/path-session/use-path-session";
import { COPY } from "./copy";
import { useGoneStore } from "./gone-store";
import type { PeerReflection } from "./peer-reflection-data";
import {
	bridgeShows,
	cardsOf,
	firstOf,
	flipped,
	liveCounts,
	type Ready,
	recount,
	resultsOf,
	wantsRecent,
} from "./peer-reflection-model";

/** Production's fallback: four recent reflections when nothing matches. */
const RECENT = { limit: 4 } as const;
const NO_IDS: Id<"reflections">[] = [];

/**
 * You're not alone on Convex: production's data flow, unchanged. The session's
 * matches, else recent ones; whether you've felt each; the path starts on
 * arrival and completes before the session end opens. "I've felt this too"
 * flips at once (an optimistic update of `hasResonated` and the count) and
 * flips back by itself when the server rate-limits it.
 */
export function usePeerReflectionData(): PeerReflection {
	const router = useRouter();
	const posthog = usePostHog();
	const { isNight } = useSessionMode();
	const { sessionId, session, isLoading, startPath, completePath } =
		usePathSession();
	const afterPath = useSessionEndHref(sessionId);
	const started = useRef(false);
	// getActive goes null once completed: claim the finish so the guard below
	// doesn't race the navigation to the session end.
	const finishing = useRef(false);
	const gone = useGoneStore((s) => s.gone);
	const leave = useGoneStore((s) => s.leave);

	useEffect(() => {
		if (started.current || !sessionId || !session) {
			return;
		}
		if (session.state === "path_selected") {
			startPath().then((ok) => {
				if (ok) {
					started.current = true;
				}
			});
		} else if (session.state === "path_in_progress") {
			started.current = true;
		}
	}, [sessionId, session, startPath]);

	// No active session (completed or abandoned elsewhere); skipped while finishing.
	useEffect(() => {
		if (!(isLoading || sessionId || finishing.current)) {
			goHome();
		}
	}, [isLoading, sessionId, router]);

	const matched = useQuery(
		api.reflections.matchForSession,
		sessionId ? { sessionId } : "skip"
	);
	const [kept, setKept] = useState<Ready | null>(null);
	const recent = useQuery(
		api.reflections.listRecent,
		wantsRecent(kept, matched) ? RECENT : "skip"
	);
	let first = kept;
	if (first === null) {
		first = firstOf(resultsOf(matched, recent), gone);
		if (first) {
			setKept(first);
		}
	}
	const shown = first && liveCounts(first, matched, recent);
	const rows = shown?.rows ?? [];
	const set = shown?.set ?? "match";
	const reflectionIds =
		rows.length > 0 ? rows.map((r) => r._id as Id<"reflections">) : NO_IDS;
	const resonated = useQuery(
		api.reflections.hasResonated,
		reflectionIds.length > 0 ? { reflectionIds } : "skip"
	);

	const toggleResonance = useMutation(
		api.reflections.toggleResonance
	).withOptimisticUpdate((store, { reflectionId }) => {
		const mine = store.getQuery(api.reflections.hasResonated, {
			reflectionIds,
		});
		if (mine === undefined) {
			return;
		}
		const on = mine[reflectionId] !== true;
		store.setQuery(
			api.reflections.hasResonated,
			{ reflectionIds },
			flipped(mine, reflectionId)
		);
		if (sessionId) {
			const m = store.getQuery(api.reflections.matchForSession, { sessionId });
			if (m) {
				store.setQuery(
					api.reflections.matchForSession,
					{ sessionId },
					recount(m, reflectionId, on)
				);
			}
		}
		const r = store.getQuery(api.reflections.listRecent, RECENT);
		if (r) {
			store.setQuery(
				api.reflections.listRecent,
				RECENT,
				recount(r, reflectionId, on)
			);
		}
	});

	const toggle = async (id: string) => {
		const index = rows.findIndex((r) => r._id === id);
		try {
			const result = await toggleResonance({
				reflectionId: id as Id<"reflections">,
			});
			if (result.rateLimited) {
				toast(COPY.toast.slow, { variant: "warning" });
				return;
			}
			posthog.capture("peer_resonance_toggled", {
				is_fallback: set === "recent",
				reflection_index: index,
				resonated: result.resonated,
			});
		} catch {
			toast(COPY.toast.failed, { variant: "danger" });
		}
	};

	const done = async () => {
		if (finishing.current) {
			return;
		}
		finishing.current = true;
		// Complete before navigating, so the session is terminal even if the app
		// closes on the session end. `afterPath` carries the id, since getActive is
		// null once completed.
		const href = afterPath("peers");
		await completePath(true);
		router.replace(href);
	};

	return {
		actions: {
			done: () => {
				done();
			},
			hide: (id) => {
				leave(id, "hidden");
				toast(COPY.toast.hidden);
				posthog.capture("peer_reflection_hidden", {
					is_fallback: set === "recent",
					reflection_index: rows.findIndex((r) => r._id === id),
				});
			},
			report: (id) => {
				router.push({
					params: { reflectionId: id },
					pathname: "/report-reflection",
				});
			},
			toggle: (id) => {
				toggle(id);
			},
		},
		state: {
			bridge: bridgeShows(session?.distilledText),
			cards: cardsOf(rows, resonated, gone),
			late: isNight,
			set,
			// Whether you've felt each comes in before the cards do, so a card you
			// already lit arrives lit rather than lighting as it lands.
			status:
				isLoading ||
				shown === null ||
				(rows.length > 0 && resonated === undefined)
					? "loading"
					: "ready",
		},
	};
}
