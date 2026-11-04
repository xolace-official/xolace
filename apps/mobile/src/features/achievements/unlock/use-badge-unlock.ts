import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { shouldShowReflectTour } from "@/features/reflect-tour/tour-copy";
import { useAppStore } from "@/store/store";
import { HOME, mayOpenUnlock } from "./unlock-gate";

/**
 * How long the way must stay clear before it opens. A session's last mutation
 * lands the award and ends the session before its screen navigates on (Exit
 * replaces home with session-end), and a push in that gap would be replaced
 * and stamped seen unshown.
 */
const SETTLE_MS = 800;

const subscribeAppState = (onChange: () => void) => {
	const sub = AppState.addEventListener("change", onChange);
	return () => sub.remove();
};
const isForeground = () => AppState.currentState === "active";

/**
 * The one subscription behind the badge moments, mounted in the protected
 * layout: opens `/badge-backfill` once for what the backfill already awarded
 * (#701), else `/badge-unlock` when unseen live badges appear (#693), when the
 * user is somewhere it may interrupt. Each route stamps its badges seen on close.
 */
export function useBadgeUnlock() {
	const pathname = usePathname();
	// Never from the background: Android can rebuild the screen tree before the user is back.
	const foreground = useSyncExternalStore(subscribeAppState, isForeground);
	const onHome = pathname === HOME;
	const unseen = useQuery(api.achievements.unlock.unseen);
	const summary = useQuery(api.achievements.firstSight.summary);
	// Home is where a session runs; elsewhere a resumable one is just waiting.
	const activeSession = useQuery(api.sessions.getActive, onHome ? {} : "skip");
	// A sheet on screen, not one merely armed: a pending follow-up arms for days.
	const homeSheetOpen = useAppStore((s) => s.homeSheetOpen);
	const reflectTourActive = useAppStore((s) => s.reflectTourActive);
	const reflectTourVersion = useAppStore((s) => s.reflectTourVersion);
	const streakRevealBusy = useAppStore((s) => s.streakRevealBusy);
	// Still loading counts as busy.
	const homeBusy =
		activeSession !== null ||
		homeSheetOpen ||
		reflectTourActive ||
		streakRevealBusy ||
		shouldShowReflectTour(reflectTourVersion);

	// Badges already handed to the route this run. If its markSeen never lands
	// (offline), they come back on the next launch rather than in a loop now.
	const opened = useRef(new Set<Id<"user_achievements">>());
	const mayOpen = foreground && mayOpenUnlock({ homeBusy, pathname });

	useEffect(() => {
		// The summary goes first, so wait until it's known whether there is one.
		if (!mayOpen || summary === undefined) {
			return;
		}
		const summaryDue = summary?.ids.some((id) => !opened.current.has(id));
		const next = summaryDue
			? { ids: summary?.ids ?? [], route: "/badge-backfill" as const }
			: {
					ids:
						unseen?.flatMap((b) => (opened.current.has(b.id) ? [] : [b.id])) ??
						[],
					route: "/badge-unlock" as const,
				};
		if (next.ids.length === 0) {
			return;
		}
		const timer = setTimeout(() => {
			for (const id of next.ids) {
				opened.current.add(id);
			}
			router.push(next.route);
		}, SETTLE_MS);
		return () => clearTimeout(timer);
	}, [mayOpen, unseen, summary]);
}
