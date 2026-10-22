import { useCallback, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppStore } from "@/src/store/store";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";

/**
 * Drive the session-end screen for an already-completed session.
 *
 * The path screens complete the session before navigating here and pass its id.
 * This hook reads that session by id (not `getActive`, which is now null) and
 * exposes callbacks that record optional post-session enrichment (mood +
 * peer-pool contribution) onto the completed session, then navigate. Because
 * completion already happened, closing the app on this screen loses nothing but
 * the optional feedback — the session is already terminal and on the timeline.
 *
 * @returns An object containing:
 * - `sessionId` — the current session identifier, if any
 * - `isLoading` — `true` while session data is loading
 * - `distilledText` — the session's distilled text, or `null` if unavailable
 * - `contributeByDefault` — whether contributions are enabled by default (defaults to `false`)
 * - `sessionCount` — the user's completed-session count
 * - `domainUnlock` — the domains this session brought into focus, if any (#523)
 * - `dismiss` — record feedback and navigate home
 * - `haveMore` — record feedback and navigate home
 */
export function useSessionEnd(sessionId: Id<"sessions"> | null) {
  const router = useRouter();
  const session = useQuery(
    api.sessions.getById,
    sessionId ? { sessionId } : "skip",
  );
  const recordFeedback = useMutation(api.sessions.recordPostSessionFeedback);
  const contributeByDefaultQuery = useQuery(
    api.preferences.getContributeByDefault,
  );
  const sessionCountQuery = useQuery(api.users.getSessionCount);
  const posthog = usePostHog();
  const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
  const busyRef = useRef(false);
  const navigatedRef = useRef(false);

  const isLoading = sessionId != null && session === undefined;

  const navigateHome = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace("/");
  }, [router]);

  // Guard: no session id, or it resolved to nothing (not owned / not found).
  useEffect(() => {
    if (!sessionId || session === null) {
      navigateHome();
    }
  }, [sessionId, session, navigateHome]);

  // Record optional feedback onto the already-completed session. Best-effort:
  // failures never block navigation, since completion already happened.
  const record = useCallback(
    async (
      contributedReflection: boolean | null,
      postSessionMood?: PostSessionMood,
    ) => {
      if (!sessionId) return;
      try {
        await recordFeedback({
          sessionId,
          contributedReflection: contributedReflection ?? undefined,
          postSessionMood,
        });
      } catch {
        // best-effort enrichment — session is already terminal
      }
    },
    [sessionId, recordFeedback],
  );

  const dismiss = async (
    contributedReflection: boolean | null = null,
    postSessionMood?: PostSessionMood,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    await record(contributedReflection, postSessionMood).finally(() => {
      busyRef.current = false;
    });
    setPendingEventPrompt(null);
    posthog.capture("session_completed", {
      post_session_mood: postSessionMood ?? null,
      contributed_reflection: contributedReflection,
      action: "dismiss",
    });
    navigateHome();
  };

  const haveMore = async (
    contributedReflection: boolean | null = null,
    postSessionMood?: PostSessionMood,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    await record(contributedReflection, postSessionMood).finally(() => {
      busyRef.current = false;
    });
    setPendingEventPrompt(null);
    posthog.capture("session_completed", {
      post_session_mood: postSessionMood ?? null,
      contributed_reflection: contributedReflection,
      action: "have_more",
    });
    navigateHome();
  };

  const sessionData = session as { distilledText?: string } | null | undefined;
  const distilledText = sessionData?.distilledText ?? null;
  const contributeByDefault = contributeByDefaultQuery ?? false;
  const sessionCount = sessionCountQuery ?? 0;

  return {
    sessionId,
    isLoading,
    distilledText,
    contributeByDefault,
    sessionCount,
    domainUnlock: session?.domainUnlock,
    dismiss,
    haveMore,
  };
}
