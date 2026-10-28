/** Tap handling. The listener misses the cold-start launch tap, so
 * `getLastNotificationResponse()` is read first and deduped. */
import {
	chatNotificationRoute,
	isChatNotificationType,
} from "@xolace/backend/convex/lib/chatNotifications";

/** The shape of an expo-notifications response that this module reads. */
export type TapResponse = {
	notification: {
		request: {
			identifier: string;
			content: { body?: string | null; data?: Record<string, any> | null };
		};
	};
};

/** Emitter surface, injected so the cold-start ordering (`getLast` returns what `subscribe`
 * never emits) is testable. */
export type TapSource<R extends TapResponse = TapResponse> = {
	getLast: () => R | null;
	subscribe: (listener: (response: R) => void) => { remove: () => void };
	/** Wipes the cached launch tap so a remount can't replay it. */
	clear: () => void;
};

/** Delivers every tap to `onTap`, including the launch tap the listener never sees. Returns an
 * unsubscribe. */
export function subscribeToNotificationTaps<R extends TapResponse>(
	source: TapSource<R>,
	onTap: (response: R) => void
): () => void {
	const launch = source.getLast();
	const launchId = launch?.notification.request.identifier ?? null;

	// The native cache holds the most recent response, warm taps included, and is
	// replayed to the next subscriber (every `(protected)` remount). Clear it once acted on.
	const consume = (response: R) => {
		source.clear();
		onTap(response);
	};

	const subscription = source.subscribe((response) => {
		// A tap that landed during subscription arrives through both paths; skip the duplicate.
		if (response.notification.request.identifier === launchId) {
			return;
		}
		consume(response);
	});

	if (launch) {
		consume(launch);
	}

	return () => subscription.remove();
}

/** Where a tap navigates. Chat routes carry params, so they differ in kind. */
export type TapNavigation =
	| { action: "navigate"; href: ReturnType<typeof chatNotificationRoute> }
	| {
			action: "push";
			href:
				| "/(protected)/quotes"
				| "/(protected)"
				| "/(protected)/kindling"
				| "/profile/insights";
	  };

export type NotificationTapPlan = {
	/** Present when the tap has an analytics row to attribute a session to. */
	logId?: string;
	/** Content for the soft framing banner on the reflect screen. */
	banner?: { content: string; notificationId: string };
	navigation?: TapNavigation;
};

/** Everything a tap should cause, from its payload alone. Chat notifications carry no `logId`. */
export function notificationTapPlan(
	data: Record<string, any> | null | undefined,
	body: string | null | undefined,
	tappedAt: number
): NotificationTapPlan {
	const plan: NotificationTapPlan = {};

	const logId = typeof data?.logId === "string" ? data.logId : undefined;
	if (logId) {
		plan.logId = logId;
		if (body) {
			plan.banner = { content: body, notificationId: logId };
		}
	}

	if (isChatNotificationType(data?.type)) {
		const conversationId =
			typeof data?.conversationId === "string" ? data.conversationId : "";
		// Only accept and message open a thread by id; the others land on Connect.
		// Without a real id, drop the navigation rather than pushing `/chat/undefined`.
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
