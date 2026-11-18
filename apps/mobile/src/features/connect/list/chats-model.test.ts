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
const US = { hour12: true, locale: "en-US" };
const row = (c: Parameters<typeof pairRow>[0]) => pairRow(c, STREAM, NOW, US);
/** ICU writes the gap before AM/PM as a narrow no-break space; compare on plain spaces. */
const plain = (s: string | null | undefined) => s?.replace(/\u202f/g, " ");

describe("chatRows", () => {
	it("pins the channel first, then the active chats in order", () => {
		const rows = chatRows(CONVERSATIONS, STREAM, NOW, US);
		expect(rows.map((r) => r.id)).toEqual(["xolace", MAYA.id, KOJO.id, ESI.id]);
	});

	it("gives the channel its last announcement and unread count", () => {
		const [channel] = chatRows(CONVERSATIONS, STREAM, NOW, US);
		expect(channel).toMatchObject({
			a11y: "Xolace, verified, 1 unread message",
			line: "Camp announcements · A new Lantern hub is open",
		});
		expect(plain(channel?.when)).toBe("7:41 PM");
	});
});

describe("pairRow", () => {
	it("shows an open chat talking, its last message and its unread", () => {
		const maya = row(MAYA);
		expect(maya.chip).toEqual({ label: "Talking", tone: "talking" });
		expect(maya.line).toBe("That sounds like a lot to carry into a Monday.");
		expect(maya.unread?.label).toBe("2");
		expect(maya.a11y).toBe(
			"Maya, Talking, here right now. That sounds like a lot to carry into a Monday. 2 unread messages"
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
		expect(kojo.a11y).toBe(
			"Kojo, Waiting. Request sent. Kojo will reply when they can"
		);
	});

	it("marks a Xolacer's incoming request with a dot", () => {
		const r = row(SEEKER_REQUEST);
		expect(r.chip?.label).toBe("New request");
		expect(r.line).toBe("Just after a session");
		expect(r.requestDot).toBe(true);
		expect(r.a11y).toBe("Camper 7K2F, New request. Just after a session");
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
		expect(ade.a11y).toBe("Ade, Closed. Ade couldn't take this one on");
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
		expect(plain(whenLabel(NOW, NOW, US))).toBe("9:41 PM");
		expect(plain(whenLabel(NOW - 21 * HOUR, NOW, US))).toBe("12:41 AM");
		expect(whenLabel(NOW - 5 * DAY, NOW, US)).toBe("Tue");
		expect(whenLabel(NOW - 18 * DAY, NOW, US)).toBe("Oct 28");
		expect(whenLabel(NOW - 400 * DAY, NOW, US)).toBe("Oct 11, 2025");
	});

	it("follows the device's locale and its 24-hour switch", () => {
		expect(whenLabel(NOW, NOW, { hour12: false, locale: "en-US" })).toBe(
			"21:41"
		);
		expect(whenLabel(NOW, NOW, { hour12: false, locale: "en-GB" })).toBe(
			"21:41"
		);
		expect(whenLabel(NOW - 18 * DAY, NOW, { locale: "en-GB" })).toBe("28 Oct");
		expect(whenLabel(NOW - 5 * DAY, NOW, { locale: "fr-FR" })).toBe("mar.");
	});
});
