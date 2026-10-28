import { describe, expect, it, vi } from "vitest";

import {
	notificationTapPlan,
	subscribeToNotificationTaps,
	type TapResponse,
	type TapSource,
} from "./notification-tap";

function response(
	identifier: string,
	data?: Record<string, any>,
	body?: string
): TapResponse {
	return { notification: { request: { content: { body, data }, identifier } } };
}

/** A fake emitter that lets a test choose cold-start or warm delivery ordering. */
function source(launch: TapResponse | null) {
	let listener: ((r: TapResponse) => void) | null = null;
	let cached = launch;
	const src: TapSource & {
		emit: (r: TapResponse) => void;
		removed: () => boolean;
	} = {
		clear: () => {
			cached = null;
		},
		// The native cache is written for *every* response, then the event is
		// emitted (NotificationsEmitter.kt) — a fake that only seeds the launch
		// response cannot see a warm tap being replayed.
		emit: (r) => {
			cached = r;
			listener?.(r);
		},
		getLast: () => cached,
		removed: () => listener === null,
		subscribe: (fn) => {
			listener = fn;
			return {
				remove: () => {
					listener = null;
				},
			};
		},
	};
	return src;
}

/** The cold-start bug: the launch tap fires before `(protected)` subscribes, so only `getLast`
 * still holds it. */
describe("subscribeToNotificationTaps", () => {
	it("delivers the launch tap the listener never fires for (cold start)", () => {
		const onTap = vi.fn();
		const launch = response("n1", {
			conversationId: "c1",
			type: "chat_message",
		});

		// The defining property of a cold start: nothing is ever emitted.
		subscribeToNotificationTaps(source(launch), onTap);

		expect(onTap).toHaveBeenCalledTimes(1);
		expect(onTap).toHaveBeenCalledWith(launch);
	});

	it("delivers a tap that arrives while the app is running (warm)", () => {
		const onTap = vi.fn();
		const src = source(null);
		subscribeToNotificationTaps(src, onTap);

		const tap = response("n2", { conversationId: "c2", type: "chat_message" });
		src.emit(tap);

		expect(onTap).toHaveBeenCalledTimes(1);
		expect(onTap).toHaveBeenCalledWith(tap);
	});

	it("handles the launch tap once when both paths deliver it", () => {
		const onTap = vi.fn();
		const launch = response("n3", {
			conversationId: "c3",
			type: "chat_message",
		});
		const src = source(launch);
		subscribeToNotificationTaps(src, onTap);

		src.emit(launch);

		expect(onTap).toHaveBeenCalledTimes(1);
	});

	it("does not replay a consumed launch tap to a later subscriber", () => {
		const src = source(
			response("n4", { conversationId: "c4", type: "chat_message" })
		);
		const first = vi.fn();
		subscribeToNotificationTaps(src, first)();

		const second = vi.fn();
		subscribeToNotificationTaps(src, second);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});

	it("does not replay a warm tap to a later subscriber", () => {
		const src = source(null);
		const first = vi.fn();
		const unsubscribe = subscribeToNotificationTaps(src, first);
		src.emit(response("n5", { conversationId: "c5", type: "chat_message" }));
		unsubscribe();

		const second = vi.fn();
		subscribeToNotificationTaps(src, second);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});

	it("unsubscribes", () => {
		const src = source(null);
		subscribeToNotificationTaps(src, vi.fn())();
		expect(src.removed()).toBe(true);
	});
});

describe("notificationTapPlan", () => {
	it("routes a message to the thread", () => {
		const plan = notificationTapPlan(
			{ conversationId: "c1", type: "chat_message" },
			"Sent you a message",
			1000
		);
		expect(plan.navigation).toEqual({
			action: "navigate",
			href: {
				params: { conversationId: "c1" },
				pathname: "/chat/[conversationId]",
			},
		});
		// Conversation notifications carry no analytics row.
		expect(plan.logId).toBeUndefined();
	});

	it("routes a Xolace-channel message to the channel screen, no conversation id needed", () => {
		const plan = notificationTapPlan(
			{ type: "xolace_message" },
			"Posted a new message",
			1000
		);
		expect(plan.navigation).toEqual({
			action: "navigate",
			href: { params: {}, pathname: "/xolace-channel" },
		});
	});

	it("drops a thread route with no usable conversation id", () => {
		for (const type of ["chat_accepted", "chat_message"]) {
			expect(
				notificationTapPlan({ type }, null, 1000).navigation
			).toBeUndefined();
			expect(
				notificationTapPlan({ conversationId: 42, type }, null, 1000).navigation
			).toBeUndefined();
			expect(
				notificationTapPlan({ conversationId: "", type }, null, 1000).navigation
			).toBeUndefined();
		}
		// The Connect-tab types never read the id, so they still route.
		expect(
			notificationTapPlan({ type: "chat_expired" }, null, 1000).navigation
		).toEqual({
			action: "navigate",
			href: { params: { t: "1000", view: "xolacers" }, pathname: "/connect" },
		});
	});

	it("routes quotes and nudges", () => {
		expect(
			notificationTapPlan({ screen: "quotes" }, null, 1).navigation
		).toEqual({
			action: "push",
			href: "/(protected)/quotes",
		});
		for (const type of ["gentle_return", "pattern_nudge", "milestone"]) {
			expect(notificationTapPlan({ type }, null, 1).navigation).toEqual({
				action: "push",
				href: "/(protected)",
			});
		}
	});

	it("routes kindling_ready to the active-kindling screen", () => {
		expect(
			notificationTapPlan({ type: "kindling_ready" }, null, 1).navigation
		).toEqual({
			action: "push",
			href: "/(protected)/kindling",
		});
	});

	it("routes domain_unlock to the insights screen", () => {
		expect(
			notificationTapPlan({ type: "domain_unlock" }, null, 1).navigation
		).toEqual({
			action: "push",
			href: "/profile/insights",
		});
	});

	it("carries the banner only when there is both a log id and a body", () => {
		expect(
			notificationTapPlan({ logId: "l1", type: "milestone" }, "Ten days", 1)
		).toMatchObject({
			banner: { content: "Ten days", notificationId: "l1" },
			logId: "l1",
		});
		expect(
			notificationTapPlan({ logId: "l1" }, null, 1).banner
		).toBeUndefined();
		expect(
			notificationTapPlan({ type: "milestone" }, "Ten days", 1).banner
		).toBeUndefined();
	});

	it("plans nothing for an unrecognised or absent payload", () => {
		expect(notificationTapPlan({ type: "something_new" }, "hi", 1)).toEqual({});
		expect(notificationTapPlan(undefined, undefined, 1)).toEqual({});
	});
});
