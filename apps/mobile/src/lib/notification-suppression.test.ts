import { describe, expect, it } from "vitest";
import {
	clearActiveNotificationConversation,
	conversationNotificationIds,
	setActiveNotificationConversation,
	suppressedInForeground,
} from "@/lib/notification-suppression";

describe("suppressedInForeground", () => {
	it("suppresses a conversation notification for the active thread", () => {
		setActiveNotificationConversation("c1");
		expect(
			suppressedInForeground({ conversationId: "c1", type: "chat_request" })
		).toBe(true);

		clearActiveNotificationConversation("c1");
	});

	it("shows conversation notifications for a different thread", () => {
		setActiveNotificationConversation("c1");
		expect(
			suppressedInForeground({ conversationId: "c2", type: "chat_message" })
		).toBe(false);
		clearActiveNotificationConversation("c1");
	});

	it("does not let a stale screen clear a newer active thread", () => {
		setActiveNotificationConversation("c2");
		clearActiveNotificationConversation("c1");
		expect(
			suppressedInForeground({ conversationId: "c2", type: "chat_message" })
		).toBe(true);
		clearActiveNotificationConversation("c2");
	});

	it("leaves AI nudges alone", () => {
		expect(suppressedInForeground({ type: "gentle_return" })).toBe(false);
		expect(suppressedInForeground({ type: "pattern_nudge" })).toBe(false);
		expect(suppressedInForeground({ type: "milestone" })).toBe(false);
		expect(suppressedInForeground({ screen: "quotes" })).toBe(false);
	});

	it("leaves a payload with no type alone", () => {
		expect(suppressedInForeground(undefined)).toBe(false);
		expect(suppressedInForeground({})).toBe(false);
	});
});

const presented = (identifier: string, data?: Record<string, unknown>) => ({
	request: { content: { data }, identifier },
});

describe("conversationNotificationIds", () => {
	it("picks only the ones for this conversation", () => {
		const ids = conversationNotificationIds(
			[
				presented("a", { conversationId: "c1", type: "chat_message" }),
				presented("b", { conversationId: "c2", type: "chat_message" }),
				presented("c", { conversationId: "c1", type: "chat_accepted" }),
			],
			"c1"
		);
		expect(ids).toEqual(["a", "c"]);
	});

	it("leaves nudges in the tray even with a matching id", () => {
		const ids = conversationNotificationIds(
			[presented("a", { conversationId: "c1", type: "gentle_return" })],
			"c1"
		);
		expect(ids).toEqual([]);
	});

	it("returns nothing when the tray is empty or nothing matches", () => {
		expect(conversationNotificationIds([], "c1")).toEqual([]);
		expect(
			conversationNotificationIds([presented("a", undefined)], "c1")
		).toEqual([]);
	});
});
