/**
 * The arrival's data hook: the one subscription behind every badge moment,
 * mounted with the app while someone is signed in (the arrivals host). It
 * stages the backfill summary once (#701), else unseen live badges (#693) led
 * by a streak milestone, when the user is somewhere it may interrupt; opens it
 * once the way has stayed clear; and stamps what it showed seen as it closes.
 */
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { Arrivals } from "@/features/achievements/arrival/arrival-data";
import {
	type ArrivalPlan,
	arrivalPlan,
	mayArrive,
} from "@/features/achievements/arrival/arrival-model";
import { shouldShowReflectTour } from "@/lib/reflect-tour-version";
import { useAppStore } from "@/store/store";

/**
 * How long the way must stay clear before it opens. A session's last mutation
 * lands the award and ends the session before its screen navigates on (Exit
 * replaces home with session-end); an arrival in that gap would land on the
 * wrong screen.
 */
const SETTLE_MS = 800;

const subscribeAppState = (onChange: () => void) => {
	const sub = AppState.addEventListener("change", onChange);
	return () => sub.remove();
};
const isForeground = () => AppState.currentState === "active";

/**
 * `isPresented`: whether a native sheet or modal is up at a pathname. The
 * navigation hub derives it from the routes' options and hands it in.
 */
export function useArrivals(
	isPresented: (pathname: string) => boolean
): Arrivals {
	const pathname = usePathname();
	// Never from the background: Android can rebuild the screen tree before the user is back.
	const foreground = useSyncExternalStore(subscribeAppState, isForeground);
	// Reflect is where a session runs; elsewhere a resumable one is just waiting.
	const onReflect = pathname === "/reflect";
	const unseen = useQuery(api.achievements.unlock.unseen);
	const summary = useQuery(api.achievements.firstSight.summary);
	const activeSession = useQuery(
		api.sessions.getActive,
		onReflect ? {} : "skip"
	);
	// A sheet on screen, not one merely armed: a pending follow-up arms for days.
	const homeSheetOpen = useAppStore((s) => s.homeSheetOpen);
	// No session exists until submit, so a half-written reflection needs its own hold.
	const homeComposing = useAppStore((s) => s.homeComposing);
	const reflectTourActive = useAppStore((s) => s.reflectTourActive);
	const reflectTourVersion = useAppStore((s) => s.reflectTourVersion);
	const streakRevealBusy = useAppStore((s) => s.streakRevealBusy);
	// Still loading counts as busy.
	const reflectBusy =
		onReflect &&
		(activeSession !== null ||
			homeComposing ||
			reflectTourActive ||
			shouldShowReflectTour(reflectTourVersion));
	const homeBusy = reflectBusy || homeSheetOpen || streakRevealBusy;
	const markUnseen = useMutation(
		api.achievements.unlock.markSeen
	).withOptimisticUpdate((store, { ids }) => {
		// Off the list at once, so a badge earned before this lands opens without the ones just shown.
		const current = store.getQuery(api.achievements.unlock.unseen, {});
		if (current !== undefined) {
			store.setQuery(
				api.achievements.unlock.unseen,
				{},
				current.filter((b) => !ids.includes(b.id))
			);
		}
	});
	const markSummary = useMutation(api.achievements.firstSight.markSeen);

	// What is staged, held still while it's up: a badge earned meanwhile waits for the next one.
	const [plan, setPlan] = useState<ArrivalPlan | null>(null);
	const [open, setOpen] = useState(false);
	// Rows already handed to an arrival this run. If the stamp never lands
	// (offline), they come back on the next launch rather than in a loop now.
	const opened = useRef(new Set<string>());
	const mayOpen =
		foreground &&
		mayArrive({ homeBusy, pathname, presented: isPresented(pathname) });

	useEffect(() => {
		// The summary goes first, so wait until it's known whether there is one.
		if (plan || !mayOpen || summary === undefined || unseen === undefined) {
			return;
		}
		const next = arrivalPlan({
			opened: opened.current,
			summary,
			unseen,
		});
		if (!next) {
			return;
		}
		for (const id of next.ids) {
			opened.current.add(id);
		}
		// Staged now (mounted hidden), opened once the way has stayed clear.
		setPlan(next);
	}, [plan, mayOpen, summary, unseen]);

	useEffect(() => {
		if (!plan || open) {
			return;
		}
		if (!mayOpen) {
			return;
		}
		const timer = setTimeout(() => setOpen(true), SETTLE_MS);
		return () => clearTimeout(timer);
	}, [plan, open, mayOpen]);

	/** The overlay has faded out: stamp what it showed, and let the next one through. */
	const closed = () => {
		if (plan) {
			const mark = plan.kind === "backfill" ? markSummary : markUnseen;
			mark({ ids: plan.ids }).catch(() => undefined);
		}
		setOpen(false);
		setPlan(null);
	};

	return {
		actions: {
			closed,
			// Already on them: closing is enough, rather than stacking a second copy.
			seeBadges: () => {
				if (!pathname.startsWith("/achievements")) {
					router.push("/achievements");
				}
			},
		},
		state: { open, plan },
	};
}
