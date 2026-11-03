import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
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

/**
 * The one subscription behind the badge unlock moment (#693), mounted in the
 * protected layout: opens `/badge-unlock` when unseen live badges appear and
 * the user is somewhere it may interrupt. The route stamps them seen on close.
 */
export function useBadgeUnlock() {
	const pathname = usePathname();
	const onHome = pathname === HOME;
	const unseen = useQuery(api.achievements.unlock.unseen);
	// Home is where a session runs; elsewhere a resumable one is just waiting.
	const activeSession = useQuery(api.sessions.getActive, onHome ? {} : "skip");
	// A sheet on screen, not one merely armed: a pending follow-up arms for days.
	const homeSheetOpen = useAppStore((s) => s.homeSheetOpen);
	const reflectTourActive = useAppStore((s) => s.reflectTourActive);
	const reflectTourVersion = useAppStore((s) => s.reflectTourVersion);
	// Still loading counts as busy.
	const homeBusy =
		activeSession !== null ||
		homeSheetOpen ||
		reflectTourActive ||
		shouldShowReflectTour(reflectTourVersion);

	// Badges already handed to the route this run. If its markSeen never lands
	// (offline), they come back on the next launch rather than in a loop now.
	const opened = useRef(new Set<Id<"user_achievements">>());
	const mayOpen = mayOpenUnlock({ homeBusy, pathname });

	useEffect(() => {
		const fresh = unseen?.filter((b) => !opened.current.has(b.id)) ?? [];
		if (!mayOpen || fresh.length === 0) {
			return;
		}
		const timer = setTimeout(() => {
			for (const b of fresh) {
				opened.current.add(b.id);
			}
			router.push("/badge-unlock");
		}, SETTLE_MS);
		return () => clearTimeout(timer);
	}, [mayOpen, unseen]);
}
