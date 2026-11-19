/** Tap handling. The listener misses the cold-start launch tap, so
 * `getLastNotificationResponse()` is read first and deduped. */
import {
	chatNotificationRoute,
	isChatNotificationType,
} from "@xolace/backend/convex/lib/chatNotifications";
import { isHeldRoute } from "@/lib/held-routes";

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

/**
 * Where a tap navigates. `navigate` reuses the screen already on top; `push`
 * always stacks; `home` is `goHome()` (`lib/landing.ts`): back to Today from
 * wherever the user is, a tab or a screen pushed over the tabs.
 */
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
				| "/(protected)/kindling"
				| "/profile/insights"
				| {
						pathname: "/letters/read/[id]";
						/** `from: "push"`: a gone letter goes to Letters, not back to Today. */
						params: { id: string; from: "push" };
				  };
	  };

export type NotificationTapPlan = {
	/** Present when the tap has an analytics row to attribute a session to. */
	logId?: string;
	/** Content for the soft framing banner on home (Today). */
	banner?: { content: string; notificationId: string };
	navigation?: TapNavigation;
};

const HOME: TapNavigation = { action: "home" };

/**
 * Letters' three pushes (letters spec §6, ids only): a letter placed with you
 * opens it in the reader; yours received or acknowledged opens the Letters screen, reusing it
 * when it's already on top. Both stack, so a held screen keeps what's in progress under them.
 */
const LETTER_FOR_YOU = "letter_for_you";
const LETTER_SENT_TYPES: ReadonlySet<unknown> = new Set([
	"letter_received",
	"letter_acknowledged",
]);

/**
 * Reflect is pushed over the tabs, so going home would pop it: mid-sentence, mid-clarify or
 * on the mirror. It isn't held for everything (a badge may open over it), only for home.
 */
const REFLECT = "/reflect";

/**
 * Everything a tap should cause, from its payload and the screen up when it came
 * (`pathname`). Going home dismisses the screens above home, so a tap on a held
 * screen (`held-routes.ts`: a vent, a talk, crisis help, a chat) or on Reflect goes
 * nowhere: nothing in progress is ever torn down. Its banner waits on Today, shown when
 * the user gets back there. Chat notifications carry no `logId`.
 */
export function notificationTapPlan(
	data: Record<string, any> | null | undefined,
	body: string | null | undefined,
	tappedAt: number,
	pathname: string
): NotificationTapPlan {
	const plan: NotificationTapPlan = {};

	const logId = typeof data?.logId === "string" ? data.logId : undefined;
	// A badge push isn't a nudge: its tap opens the badges, not a session.
	if (logId && data?.type !== "achievement") {
		plan.logId = logId;
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
	} else if (data?.type === "domain_unlock" && !isHeldRoute(pathname)) {
		// Steadiness lives in the You tab (/you/steadiness). The old path's MovedRoute shim gets
		// there the right way from anywhere: back to the tabs when they're in the stack, in the
		// shim's own place when they aren't. From here, dismissTo would replace the screen on top
		// when the tabs aren't in the stack yet ("/", on a cold start), and navigate would stack a
		// second copy of the tabs. The shim's dismissTo would pop a held screen above the tabs,
		// so a tap on one goes nowhere, as home's does.
		plan.navigation = { action: "push", href: "/profile/insights" };
	} else if (data?.type === LETTER_FOR_YOU) {
		// Without a real id, drop the navigation rather than opening a reader with nothing in it.
		const letterId = typeof data.letterId === "string" ? data.letterId : "";
		if (letterId) {
			plan.navigation = {
				action: "push",
				// `from`: if the letter is gone, the reader goes to Letters, not back to Today.
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
		// Off a held screen, so the unlock moment can open over the badges.
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

	// The banner lives on home, so a tap that opens another screen would leave it
	// waiting there for later. A tap with no route (a follow-up) goes nowhere new.
	const opensElsewhere = plan.navigation && plan.navigation !== HOME;
	if (logId && body && !opensElsewhere) {
		plan.banner = { content: body, notificationId: logId };
	}

	return plan;
}
