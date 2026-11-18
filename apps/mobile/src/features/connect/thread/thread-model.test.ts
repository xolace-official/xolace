import { describe, expect, it } from "vitest";
import { NOW } from "../dev/fixtures";
import {
	CLOSED,
	DECLINED,
	INCOMING,
	MINUTE,
	OPEN,
	REQUESTED,
	RESTING,
} from "./dev/thread-fixtures";
import {
	longAgo,
	resourceRow,
	statusBar,
	threadBody,
	threadSubtitle,
} from "./thread-model";

const DAY = 86_400_000;
const idle = { presence: null, typing: false };
const text = (runs: readonly { text: string }[]) =>
	runs.map((r) => r.text).join("");

describe("threadSubtitle", () => {
	it("reads Stream's live signal in an open thread, Xolacer · in front for a seeker", () => {
		expect(threadSubtitle(OPEN, { ...idle, typing: true }, NOW)).toBe(
			"Xolacer · typing…"
		);
		expect(
			threadSubtitle(OPEN, { presence: { online: true }, typing: false }, NOW)
		).toBe("Xolacer · here now");
		expect(
			threadSubtitle(
				OPEN,
				{
					presence: { lastActive: NOW - 3 * DAY, online: false },
					typing: false,
				},
				NOW
			)
		).toBe("Xolacer · last here 3 days ago");
		expect(threadSubtitle(OPEN, idle, NOW)).toBe(
			"Xolacer · usually replies within a day"
		);
	});

	it("drops the prefix for a Xolacer, who is talking to a seeker", () => {
		expect(
			threadSubtitle(
				{ ...OPEN, role: "xolacer" },
				{ ...idle, typing: true },
				NOW
			)
		).toBe("typing…");
	});

	it("says where a request, a rest or a close stands", () => {
		expect(threadSubtitle(REQUESTED, idle, NOW)).toBe(
			"Request sent, no reply yet"
		);
		expect(threadSubtitle(INCOMING, idle, NOW)).toBe(
			"Waiting on you · just after a session"
		);
		expect(threadSubtitle(RESTING, idle, NOW)).toBe(
			"Resting · last spoke 2 weeks ago"
		);
		expect(threadSubtitle(CLOSED, idle, NOW)).toBe(
			"Not taking conversations right now"
		);
	});
});

describe("threadBody", () => {
	it("waits on Stream only where a channel exists", () => {
		expect(threadBody(REQUESTED, "connecting").kind).toBe("no-channel");
		expect(threadBody(DECLINED, "ready")).toEqual({
			kind: "no-channel",
			note: "Nothing was said here.",
		});
		expect(threadBody(OPEN, "connecting").kind).toBe("connecting");
		expect(threadBody(OPEN, "unavailable").kind).toBe("unavailable");
		expect(threadBody(OPEN, "ready").kind).toBe("messages");
	});
});

describe("statusBar", () => {
	it("leaves an open thread to the composer", () => {
		expect(statusBar(OPEN).kind).toBe("composer");
	});

	it("offers a Xolacer accept or decline, and tells them who's still here", () => {
		const bar = statusBar(INCOMING);
		expect(bar.kind).toBe("accept");
		expect(bar.kind === "accept" && text(bar.copy)).toContain(
			"They're still in the app right now."
		);
	});

	it("tells a seeker their request is out", () => {
		const bar = statusBar(REQUESTED);
		expect(bar.kind === "sent" && text(bar.copy)).toContain(
			"Maya has stepped away for now."
		);
	});

	it("offers to pick a resumable rest back up, and to rate", () => {
		expect(statusBar(RESTING)).toMatchObject({
			kind: "resume",
			rate: "How was this conversation?",
		});
	});

	it("says the same thing for every close, and never names a block", () => {
		const bar = statusBar(CLOSED);
		expect(bar).toMatchObject({
			findAnother: true,
			kind: "closed",
			rate: "Change how you rated this",
		});
		expect(bar.kind === "closed" && text(bar.copy)).not.toMatch(/block/i);
		expect(statusBar(DECLINED).kind === "closed").toBe(true);
	});

	it("holds the bar for a seeded rest until the real row lands", () => {
		expect(statusBar({ ...RESTING, seeded: true }).kind).toBe("holding");
		expect(statusBar({ ...INCOMING, seeded: true }).kind).toBe("accept");
	});

	it("never offers a Xolacer someone else on a close", () => {
		expect(statusBar({ ...CLOSED, role: "xolacer" })).toMatchObject({
			findAnother: false,
			rate: null,
		});
	});
});

describe("longAgo", () => {
	it("reads in days, weeks, then months", () => {
		expect(longAgo(NOW - MINUTE, NOW)).toBe("today");
		expect(longAgo(NOW - DAY, NOW)).toBe("yesterday");
		expect(longAgo(NOW - 7 * DAY, NOW)).toBe("a week ago");
		expect(longAgo(NOW - 40 * DAY, NOW)).toBe("a month ago");
	});
});

describe("resourceRow", () => {
	it("calls a phone line and opens nothing for a text one", () => {
		const call = resourceRow({ label: "988", type: "phone", value: "988" });
		expect(call).toMatchObject({ action: "Call", phone: true, url: "tel:988" });
		expect(
			resourceRow({ label: "Text HOME", type: "text", value: "to 741741" })
		).toMatchObject({ action: null, url: null });
	});
});
