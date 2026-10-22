/**
 * What a notification tap does — and how the tap reaches us at all.
 *
 * The delivery half is the bug this file exists for.
 * `addNotificationResponseReceivedListener` only fires for taps that happen
 * *while it is subscribed*. On a cold start the OS hands the launch tap to the
 * native module during startup, long before `(protected)` mounts — that layout
 * waits on fonts, Clerk, Convex auth and the intake-gate query, which on a cold
 * launch is seconds of network. By the time the listener subscribes the event
 * has been and gone, so the tap was silently dropped and the app just opened on
 * the home screen. Warm taps worked because the listener was already there,
 * which is why this looked like a cold-start-only bug.
 *
 * The launch tap survives in `getLastNotificationResponse()`, so subscribing
 * reads that first and dedupes it against the listener.
 */
import {
  chatNotificationRoute,
  isChatNotificationType,
} from "@/convex/lib/chatNotifications";

/** The shape of an expo-notifications response that this module reads. */
export type TapResponse = {
  notification: {
    request: {
      identifier: string;
      content: { body?: string | null; data?: Record<string, any> | null };
    };
  };
};

/**
 * The emitter surface, injected so the cold-start ordering is testable without
 * a device: a real cold start is `getLast` returning a response that `subscribe`
 * will never emit.
 */
export type TapSource<R extends TapResponse = TapResponse> = {
  getLast: () => R | null;
  subscribe: (listener: (response: R) => void) => { remove: () => void };
  /** Wipes the cached launch tap so a remount can't replay it. */
  clear: () => void;
};

/**
 * Deliver every notification tap to `onTap` — including the one that launched
 * the process, which the listener alone never sees.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToNotificationTaps<R extends TapResponse>(
  source: TapSource<R>,
  onTap: (response: R) => void,
): () => void {
  const launch = source.getLast();
  const launchId = launch?.notification.request.identifier ?? null;

  // Every tap is cleared once acted on, warm ones included. The native cache
  // holds the *most recent* response, not just the launch one, so a tap left
  // sitting there is replayed to the next subscriber — and this resubscribes
  // whenever `(protected)` remounts (sign out → sign in) or Clerk's signed-in
  // flag flips. Without this, coming back would yank the user into a thread
  // they already read.
  const consume = (response: R) => {
    source.clear();
    onTap(response);
  };

  const subscription = source.subscribe((response) => {
    // A tap that landed while we were subscribing arrives through both paths.
    // Handling it twice would navigate twice.
    if (response.notification.request.identifier === launchId) return;
    consume(response);
  });

  if (launch) consume(launch);

  return () => subscription.remove();
}

/** Where a tap navigates. Chat routes carry params, so they differ in kind. */
export type TapNavigation =
  | { action: "navigate"; href: ReturnType<typeof chatNotificationRoute> }
  | {
      action: "push";
      href: "/(protected)/quotes" | "/(protected)" | "/(protected)/kindling" | "/profile/insights";
    };

export type NotificationTapPlan = {
  /** Present when the tap has an analytics row to attribute a session to. */
  logId?: string;
  /** Content for the soft framing banner on the reflect screen. */
  banner?: { content: string; notificationId: string };
  navigation?: TapNavigation;
};

/**
 * Everything a tap should cause, derived from its payload alone.
 *
 * Conversation notifications carry a `conversationId` rather than a `logId` —
 * there is no analytics row to mark — so they never produce one.
 */
export function notificationTapPlan(
  data: Record<string, any> | null | undefined,
  body: string | null | undefined,
  tappedAt: number,
): NotificationTapPlan {
  const plan: NotificationTapPlan = {};

  const logId = typeof data?.logId === "string" ? data.logId : undefined;
  if (logId) {
    plan.logId = logId;
    if (body) plan.banner = { content: body, notificationId: logId };
  }

  if (isChatNotificationType(data?.type)) {
    const conversationId =
      typeof data?.conversationId === "string" ? data.conversationId : "";
    // Only accept and message open a thread by id; the other three land on
    // Connect and ignore it. Without a real id there is no thread to open, so
    // drop the navigation rather than pushing `/chat/undefined`.
    const opensThread =
      data!.type === "chat_accepted" || data!.type === "chat_message";
    if (conversationId || !opensThread) {
      plan.navigation = {
        action: "navigate",
        href: chatNotificationRoute(data!.type, conversationId, tappedAt),
      };
    }
  } else if (data?.screen === "quotes") {
    plan.navigation = { action: "push", href: "/(protected)/quotes" };
  } else if (data?.type === "domain_unlock") {
    plan.navigation = { action: "push", href: "/profile/insights" };
  } else if (data?.type === "kindling_ready") {
    plan.navigation = { action: "push", href: "/(protected)/kindling" };
  } else if (
    data?.type === "gentle_return" ||
    data?.type === "pattern_nudge" ||
    data?.type === "milestone" ||
    data?.type === "streak_milestone"
  ) {
    plan.navigation = { action: "push", href: "/(protected)" };
  }

  return plan;
}
