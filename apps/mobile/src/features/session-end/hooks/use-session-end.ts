import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef } from "react";
import {
	BROWSE_HREF,
	type BrowseFamily,
} from "@/features/session-end/coping-suggestion";
import { useAppStore } from "@/store/store";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";

/** What the session-end screen collected, recorded before leaving it. */
type Feedback = {
	contributedReflection: boolean | null;
	postSessionMood?: PostSessionMood;
	moodPosition?: number;
};

/** Drives the session-end screen for an already-completed session, read by id
 * (`getActive` is null by now). Feedback is optional enrichment, so closing
 * the app here loses nothing but that. */
export function useSessionEnd(sessionId: Id<"sessions"> | null) {
	const router = useRouter();
	const session = useQuery(
		api.sessions.getById,
		sessionId ? { sessionId } : "skip"
	);
	const recordFeedback = useMutation(api.sessions.recordPostSessionFeedback);
	const contributeByDefaultQuery = useQuery(
		api.preferences.getContributeByDefault
	);
	const sessionCountQuery = useQuery(api.users.getSessionCount);
	const posthog = usePostHog();
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const busyRef = useRef(false);
	const navigatedRef = useRef(false);

	const isLoading = sessionId != null && session === undefined;

	const navigateHome = useCallback(() => {
		if (navigatedRef.current) {
			return;
		}
		navigatedRef.current = true;
		router.replace("/");
	}, [router]);

	// No session id, or it resolved to nothing (not owned / not found).
	useEffect(() => {
		if (!sessionId || session === null) {
			navigateHome();
		}
	}, [sessionId, session, navigateHome]);

	// Best-effort: failures never block navigation, since completion already happened.
	const record = useCallback(
		async (
			contributedReflection: boolean | null,
			postSessionMood?: PostSessionMood,
			moodPosition?: number
		) => {
			if (!sessionId) {
				return;
			}
			try {
				await recordFeedback({
					contributedReflection: contributedReflection ?? undefined,
					moodPosition,
					postSessionMood,
					sessionId,
				});
			} catch {
				// best-effort enrichment
			}
		},
		[sessionId, recordFeedback]
	);

	const dismiss = async (
		contributedReflection: boolean | null = null,
		postSessionMood?: PostSessionMood,
		moodPosition?: number
	) => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		await record(contributedReflection, postSessionMood, moodPosition).finally(
			() => {
				busyRef.current = false;
			}
		);
		setPendingEventPrompt(null);
		posthog.capture("session_completed", {
			action: "dismiss",
			contributed_reflection: contributedReflection,
			mood_position: moodPosition ?? null,
			post_session_mood: postSessionMood ?? null,
		});
		navigateHome();
	};

	const haveMore = async (
		contributedReflection: boolean | null = null,
		postSessionMood?: PostSessionMood,
		moodPosition?: number
	) => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		await record(contributedReflection, postSessionMood, moodPosition).finally(
			() => {
				busyRef.current = false;
			}
		);
		setPendingEventPrompt(null);
		posthog.capture("session_completed", {
			action: "have_more",
			contributed_reflection: contributedReflection,
			mood_position: moodPosition ?? null,
			post_session_mood: postSessionMood ?? null,
		});
		navigateHome();
	};

	/** Leaves session-end for somewhere other than home: records the feedback first, then
	 * captures `session_completed` with this exit's own properties. */
	const leaveFor = async (
		{ contributedReflection, postSessionMood, moodPosition }: Feedback,
		exit: Record<string, string | boolean>,
		navigate: () => void
	) => {
		if (busyRef.current || navigatedRef.current) {
			return;
		}
		busyRef.current = true;
		await record(contributedReflection, postSessionMood, moodPosition).finally(
			() => {
				busyRef.current = false;
			}
		);
		setPendingEventPrompt(null);
		posthog.capture("session_completed", {
			...exit,
			contributed_reflection: contributedReflection,
			mood_position: moodPosition ?? null,
			post_session_mood: postSessionMood ?? null,
		});
		navigatedRef.current = true;
		navigate();
	};

	/** Leaves for the kindling: Discovery replaces session-end, and when this
	 * session's kindling has already landed it opens on top, so back returns to
	 * Discovery rather than here. */
	const openKindling = (
		ready: boolean,
		contributedReflection: boolean | null = null,
		postSessionMood?: PostSessionMood,
		moodPosition?: number
	) =>
		leaveFor(
			{ contributedReflection, moodPosition, postSessionMood },
			{ action: "open_kindling", kindling_ready: ready },
			() => {
				// Cast until typedRoutes regenerates (see idle-menu's /discovery).
				router.replace("/discovery" as never);
				if (ready) {
					router.push("/(protected)/kindling");
				}
			}
		);

	/** Leaves for the Browse shelf the coping answer picked (#712). The tab replaces
	 * session-end, anchored on the Browse hub so back lands there. */
	const openBrowse = (
		family: BrowseFamily,
		contributedReflection: boolean | null = null,
		postSessionMood?: PostSessionMood,
		moodPosition?: number
	) =>
		leaveFor(
			{ contributedReflection, moodPosition, postSessionMood },
			{ action: "open_browse", browse_family: family },
			() => router.replace(BROWSE_HREF[family], { withAnchor: true })
		);

	const sessionData = session as { distilledText?: string } | null | undefined;
	const distilledText = sessionData?.distilledText ?? null;
	const contributeByDefault = contributeByDefaultQuery ?? false;
	const sessionCount = sessionCountQuery ?? 0;

	return {
		contributeByDefault,
		dismiss,
		distilledText,
		domainUnlock: session?.domainUnlock,
		haveMore,
		isLoading,
		openBrowse,
		openKindling,
		sessionCount,
		sessionId,
	};
}
