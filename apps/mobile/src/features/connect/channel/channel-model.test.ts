import type { Channel } from "stream-chat";
import { describe, expect, it } from "vitest";
import { NOW } from "../dev/fixtures";
import { channelState, postView } from "./channel-model";

const HOUR = 3_600_000;
const US = { hour12: true, locale: "en-US" };

describe("postView", () => {
	const post = {
		created_at: new Date(NOW - 2 * HOUR).toISOString(),
		own_reactions: [{ type: "love" }],
		reaction_groups: {
			hug: { count: 24 },
			love: { count: 41 },
			mystery: { count: 3 },
			thanks: { count: 0 },
		},
		text: "A new Lantern hub is open\n\nEight short reads on sleep.",
	};

	it("shows the used reactions in picker order, marking yours", () => {
		const v = postView(post, NOW, US);
		expect(v.reactions.map((r) => [r.emoji, r.count, r.mine])).toEqual([
			["🫂", 24, false],
			["❤️", 41, true],
		]);
		expect(v.reactions.map((r) => r.a11y)).toEqual(["Hug, 24", "Love, 41"]);
	});

	it("hints what a tap does with one reaction each: take yours back, or swap it", () => {
		const v = postView(post, NOW, US);
		expect(v.reactions.map((r) => r.hint)).toEqual([
			"Changes your reaction to this one",
			"Takes your reaction back",
		]);
		const none = postView({ ...post, own_reactions: [] }, NOW, US);
		expect(none.reactions[0]?.hint).toBe("Adds your reaction");
	});

	it("gives the time of day, whatever the day (the separator says the day)", () => {
		const old = {
			...post,
			created_at: new Date(NOW - 50 * HOUR).toISOString(),
		};
		expect(postView(old, NOW, US).when.replace(/\u202f/g, " ")).toBe("7:41 PM");
	});

	it("reads title, body and time to a screen reader", () => {
		expect(postView(post, NOW, US).a11y.replace(/ /g, " ")).toBe(
			"A new Lantern hub is open. Eight short reads on sleep. 7:41 PM"
		);
	});

	it("survives a message with no reactions or text", () => {
		expect(postView({}, NOW, US)).toMatchObject({
			body: "",
			reactions: [],
			title: null,
		});
	});
});

describe("links and markdown", () => {
	const text =
		"**Quiet hours**\n\nNudges wait until _morning_. Read [how it works](https://xolace.app/quiet) or https://xolace.app/lantern.";

	it("keeps the body's markdown for Stream to render, and its links for VoiceOver", () => {
		const v = postView({ text }, NOW, US);
		expect(v.title).toBe("Quiet hours");
		expect(v.body).toContain("[how it works](https://xolace.app/quiet)");
		expect(v.links).toEqual([
			"https://xolace.app/quiet",
			"https://xolace.app/lantern",
		]);
	});

	it("keeps a link in the opening line tappable and in VoiceOver's actions", () => {
		const v = postView(
			{ text: "New at https://xolace.app/lantern\n\nEight short reads." },
			NOW,
			US
		);
		expect(v.title).toBeNull();
		expect(v.body).toContain("https://xolace.app/lantern");
		expect(v.links).toEqual(["https://xolace.app/lantern"]);
	});

	it("reads the words, not the marks", () => {
		expect(postView({ text }, NOW, US).a11y).toContain(
			"Quiet hours. Nudges wait until morning. Read how it works or https://xolace.app/lantern"
		);
	});
});

describe("postView's kinds", () => {
	const at = new Date(NOW - 2 * HOUR).toISOString();
	const text = "Quiet hours\n\nNudges wait until morning.";
	const reaction_groups = { hug: { count: 3 } };

	it("draws a post as a post, with its reactions", () => {
		const v = postView({ created_at: at, reaction_groups, text }, NOW, US);
		expect(v).toMatchObject({
			edited: false,
			kind: "post",
			title: "Quiet hours",
		});
		expect(v.reactions).toHaveLength(1);
	});

	it("keeps none of a removed post: no words, no reactions, one quiet line", () => {
		for (const removed of [
			{ type: "deleted" },
			{ deleted_at: at, type: "regular" },
		]) {
			const v = postView(
				{ created_at: at, reaction_groups, text, ...removed },
				NOW,
				US
			);
			expect(v).toMatchObject({
				body: "",
				edited: false,
				kind: "deleted",
				reactions: [],
				title: null,
			});
			expect(v.a11y.replace(/\u202f/g, " ")).toBe(
				"This post was removed. 7:41 PM"
			);
		}
	});

	it("tells the sender a broadcast didn't send, either way Stream marks it", () => {
		for (const failed of [{ type: "error" }, { status: "failed" }]) {
			const v = postView(
				{ created_at: at, reaction_groups, text, ...failed },
				NOW,
				US
			);
			expect(v).toMatchObject({
				kind: "failed",
				reactions: [],
				title: "Quiet hours",
			});
			expect(v.a11y).toContain("This post didn't send");
		}
	});

	it("marks an edited post, and says it after the time", () => {
		const v = postView(
			{ created_at: at, message_text_updated_at: at, text },
			NOW,
			US
		);
		expect(v.edited).toBe(true);
		expect(v.a11y.replace(/\u202f/g, " ")).toBe(
			"Quiet hours. Nudges wait until morning. 7:41 PM, edited"
		);
	});
});

describe("channelState", () => {
	const channel = { cid: "xolace:camp" } as unknown as Channel;

	it("draws the list, with its channel, once Stream is up and the channel holds state", () => {
		expect(channelState("ready", true, channel)).toEqual({
			body: "messages",
			channel,
		});
	});

	it("waits while Stream connects, even with a channel in hand", () => {
		expect(channelState("connecting", true, channel)).toEqual({
			body: "connecting",
		});
		expect(channelState("connecting", false, null)).toEqual({
			body: "connecting",
		});
	});

	it("waits for the channel's state, and for a channel at all", () => {
		expect(channelState("ready", false, channel)).toEqual({
			body: "connecting",
		});
		expect(channelState("ready", true, null)).toEqual({ body: "connecting" });
	});

	it("offers a retry once Stream fails, whatever it held", () => {
		expect(channelState("unavailable", true, channel)).toEqual({
			body: "unavailable",
		});
	});
});
