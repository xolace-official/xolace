/** Tap handling. The listener misses the cold-start launch tap, so
 * `getLastNotificationResponse()` is read first and deduped. */
import {
	chatNotificationRoute,
	isChatNotificationType,
} from "@xolace/backend/convex/lib/chatNotifications";
import { isHeldRoute } from "@/lib/held-routes";

export type TapResponse = {
	notification: {
		request: {
			identifier: string;
			content: { body?: string | null; data?: Record<string, any> | null };
		};
	};
};

export type TapSource<R extends TapResponse = TapResponse> = {
	getLast: () => R | null;
	subscribe: (listener: (response: R) => void) => { remove: () => void };
	clear: () => void;
};

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

export type TapNavigation =
	| {
			action: "navigate";
			href:
				| ReturnType<typeof chatNotificationRoute>
				| "/(protected)/achievements"
				| "/(protected)/letters";
	  }
	| { action: "home" }
	| {
			action: "push";
			href:
				| "/(protected)/quotes"
				| {
						pathname: "/(protected)/quotes";
						params: { quote: string };
				  }
				| "/(protected)/kindling"
				| "/profile/insights"
				| {
						pathname: "/letters/read/[id]";
						params: { id: string; from: "push" };
				  };
	  };

export type NotificationTapPlan = {
	logId?: string;
	banner?: { content: string; notificationId: string };
	navigation?: TapNavigation;
};

const HOME: TapNavigation = { action: "home" };

const LETTER_FOR_YOU = "letter_for_you";
const LETTER_SENT_TYPES: ReadonlySet<unknown> = new Set([
	"letter_received",
	"letter_acknowledged",
]);

const REFLECT = "/reflect";

export function notificationTapPlan(
	data: Record<string, any> | null | undefined,
	body: string | null | undefined,
	tappedAt: number,
	pathname: string
): NotificationTapPlan {
	const plan: NotificationTapPlan = {};

	const logId = typeof data?.logId === "string" ? data.logId : undefined;
	if (logId && data?.type !== "achievement") {
		plan.logId = logId;
	}

	if (isChatNotificationType(data?.type)) {
		const conversationId =
			typeof data?.conversationId === "string" ? data.conversationId : "";
		const opensThread =
			data!.type === "chat_accepted" || data!.type === "chat_message";
		if (conversationId || !opensThread) {
			plan.navigation = {
				action: "navigate",
				href: chatNotificationRoute(data!.type, conversationId, tappedAt),
			};
		}
	} else if (data?.screen === "quotes") {
		const quote = typeof data.quoteId === "string" ? data.quoteId : "";
		plan.navigation = {
			action: "push",
			href: quote
				? { params: { quote }, pathname: "/(protected)/quotes" }
				: "/(protected)/quotes",
		};
	} else if (data?.type === "domain_unlock" && !isHeldRoute(pathname)) {
		plan.navigation = { action: "push", href: "/profile/insights" };
	} else if (data?.type === LETTER_FOR_YOU) {
		const letterId = typeof data.letterId === "string" ? data.letterId : "";
		if (letterId) {
			plan.navigation = {
				action: "push",
				href: {
					params: { from: "push", id: letterId },
					pathname: "/letters/read/[id]",
				},
			};
		}
	} else if (LETTER_SENT_TYPES.has(data?.type)) {
		plan.navigation = { action: "navigate", href: "/(protected)/letters" };
	} else if (data?.type === "kindling_ready") {
		plan.navigation = { action: "push", href: "/(protected)/kindling" };
	} else if (data?.type === "achievement") {
		plan.navigation = { action: "navigate", href: "/(protected)/achievements" };
	} else if (
		(data?.type === "gentle_return" ||
			data?.type === "pattern_nudge" ||
			data?.type === "milestone" ||
			data?.type === "streak_milestone") &&
		!isHeldRoute(pathname) &&
		pathname !== REFLECT
	) {
		plan.navigation = HOME;
	}

	const opensElsewhere = plan.navigation && plan.navigation !== HOME;
	if (logId && body && !opensElsewhere) {
		plan.banner = { content: body, notificationId: logId };
	}

	return plan;
}
