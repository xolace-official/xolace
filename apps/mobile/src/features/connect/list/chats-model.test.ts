import { CHAT_REQUEST_SUBTITLE } from "@xolace/backend/convex/lib/chatNotifications";
import { describe, expect, it } from "vitest";
import {
	ADE_DECLINED,
	ARCHIVED_ONLY,
	CONVERSATIONS,
	DIRECT_REQUEST,
	ESI,
	KOJO,
	MAYA,
	NO_CHATS,
	NOW,
	REN_ARCHIVED,
	SEEKER_REQUEST,
	STREAM,
} from "../dev/fixtures";
import {
	archivedCount,
	archivedRows,
	chatRows,
	chatsEmpty,
	landingSegment,
	type PairRowView,
	pairRow,
	unreadBadge,
	whenLabel,
} from "./chats-model";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const row = (c: Parameters<typeof pairRow>[0]) => pairRow(c, STREAM, NOW);

describe("chatRows", () => {
	it("pins the channel first, then the active chats in order", () => {
		const rows = chatRows(CONVERSATIONS, STREAM, NOW);
		expect(rows.map((r) => r.id)).toEqual(["xolace", MAYA.id, KOJO.id, ESI.id]);
	});

	it("gives the channel its last announcement and unread count", () => {
		const [channel] = chatRows(CONVERSATIONS, STREAM, NOW);
		expect(channel).toMatchObject({
			a11y: "Xolace, verified, 1 unread message",
			line: "Camp announcements · A new Lantern hub is open",
			when: "7:41 pm",
		});
	});
});

describe("pairRow", () => {
	it("shows an open chat talking, its last message and its unread", () => {
		const maya = row(MAYA);
		expect(maya.chip).toEqual({ label: "Talking", tone: "talking" });
		expect(maya.line).toBe("That sounds like a lot to carry into a Monday.");
		expect(maya.unread?.label).toBe("2");
		expect(maya.a11y).toBe(
			"Conversation with Maya, here right now, 2 unread messages"
		);
	});

	it("drops line 2 for an open chat Stream hasn't loaded", () => {
		expect(pairRow(MAYA, {}, NOW).line).toBeNull();
	});

	it("says a seeker's request is waiting", () => {
		const kojo = row(KOJO);
		expect(kojo.chip).toEqual({ label: "Waiting", tone: "waiting" });
		expect(kojo.line).toBe("Request sent. Kojo will reply when they can.");
		expect(kojo.requestDot).toBe(false);
		expect(kojo.unread).toBeNull();
	});

	it("marks a Xolacer's incoming request with a dot", () => {
		const r = row(SEEKER_REQUEST);
		expect(r.chip?.label).toBe("New request");
		expect(r.line).toBe("Just after a session");
		expect(r.requestDot).toBe(true);
	});

	it("gives a direct request the push's words, since it has no channel yet", () => {
		const r = row(DIRECT_REQUEST);
		expect(r.line).toBe(CHAT_REQUEST_SUBTITLE);
		expect(r.requestDot).toBe(true);
	});

	it("tells quiet resting from wrapped up", () => {
		expect(row(ESI).line).toBe("Gone quiet. Pick it back up anytime.");
		expect(row(ESI).chip?.label).toBe("Resting");
		const ren = row(REN_ARCHIVED);
		expect(ren.chip?.label).toBe("Wrapped up");
		expect(ren.line).toBe("Ren wrapped this up. Pick it back up anytime.");
	});

	it("mutes a closed request and offers delete only there", () => {
		const ade = row(ADE_DECLINED);
		expect(ade.muted).toBe(true);
		expect(ade.line).toBe("Ade couldn't take this one on");
		expect(ade.menu).toEqual({
			archived: true,
			canClose: false,
			canDelete: true,
		});
	});

	it("offers Close only to the Xolacer on an open chat", () => {
		const own = { ...MAYA, role: "xolacer" as const };
		expect(row(own).menu.canClose).toBe(true);
		expect(row(MAYA).menu.canClose).toBe(false);
	});

	it("names blocked and expired closes plainly", () => {
		const closed = (
			closedReason: PairRowView["conversation"]["closedReason"]
		) => row({ ...ADE_DECLINED, closedReason }).line;
		expect(closed("blocked")).toBe("This conversation is closed");
		expect(closed("expired")).toBe("This request quietly expired");
		expect(closed(undefined)).toBe("Everything you two wrote is still here");
	});
});

describe("archived", () => {
	it("lists only archived pair chats and counts them", () => {
		expect(archivedRows(CONVERSATIONS, STREAM, NOW).map((r) => r.id)).toEqual([
			ADE_DECLINED.id,
			REN_ARCHIVED.id,
		]);
		expect(archivedCount(CONVERSATIONS)).toBe(2);
	});
});

describe("chatsEmpty", () => {
	it("tells none from all-archived", () => {
		expect(chatsEmpty(CONVERSATIONS)).toBeNull();
		expect(chatsEmpty(NO_CHATS)).toBe("none");
		expect(chatsEmpty(ARCHIVED_ONLY)).toBe("archived");
	});
});

describe("landingSegment", () => {
	it("takes what was picked, else Chats once there's any row", () => {
		expect(landingSegment("xolacers", CONVERSATIONS)).toBe("xolacers");
		expect(landingSegment(null, NO_CHATS)).toBe("chats");
		expect(landingSegment(null, [])).toBe("xolacers");
	});
});

describe("unreadBadge", () => {
	it("caps the label, never the spoken count", () => {
		expect(unreadBadge(0)).toBeNull();
		expect(unreadBadge(1)?.a11y).toBe("1 unread message");
		expect(unreadBadge(150)).toEqual({
			a11y: "150 unread messages",
			label: "99+",
		});
	});
});

describe("whenLabel", () => {
	it("reads time today, weekday this week, date before", () => {
		expect(whenLabel(NOW, NOW)).toBe("9:41 pm");
		expect(whenLabel(NOW - 21 * HOUR, NOW)).toBe("12:41 am");
		expect(whenLabel(NOW - 5 * DAY, NOW)).toBe("Tue");
		expect(whenLabel(NOW - 18 * DAY, NOW)).toBe("Oct 28");
		expect(whenLabel(NOW - 400 * DAY, NOW)).toBe("Oct 11, 2025");
	});
});
