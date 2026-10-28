import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/store/store";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";

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
			postSessionMood?: PostSessionMood
		) => {
			if (!sessionId) {
				return;
			}
			try {
				await recordFeedback({
					contributedReflection: contributedReflection ?? undefined,
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
		postSessionMood?: PostSessionMood
	) => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		await record(contributedReflection, postSessionMood).finally(() => {
			busyRef.current = false;
		});
		setPendingEventPrompt(null);
		posthog.capture("session_completed", {
			action: "dismiss",
			contributed_reflection: contributedReflection,
			post_session_mood: postSessionMood ?? null,
		});
		navigateHome();
	};

	const haveMore = async (
		contributedReflection: boolean | null = null,
		postSessionMood?: PostSessionMood
	) => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		await record(contributedReflection, postSessionMood).finally(() => {
			busyRef.current = false;
		});
		setPendingEventPrompt(null);
		posthog.capture("session_completed", {
			action: "have_more",
			contributed_reflection: contributedReflection,
			post_session_mood: postSessionMood ?? null,
		});
		navigateHome();
	};

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
		sessionCount,
		sessionId,
	};
}
