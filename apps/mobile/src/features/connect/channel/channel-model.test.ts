import { describe, expect, it } from "vitest";
import { NOW } from "../dev/fixtures";
import { channelBody, postView, splitPost } from "./channel-model";

const HOUR = 3_600_000;
const US = { hour12: true, locale: "en-US" };

describe("splitPost", () => {
	it("takes a short first paragraph over more as the title", () => {
		expect(
			splitPost(
				"A new Lantern hub is open\n\nEight short reads on sleep, written with people who've been up at 3am too."
			)
		).toEqual({
			body: "Eight short reads on sleep, written with people who've been up at 3am too.",
			title: "A new Lantern hub is open",
		});
	});

	it("leaves a one-paragraph post, or a long opening, all body", () => {
		expect(splitPost("Badges are here.")).toEqual({
			body: "Badges are here.",
			title: null,
		});
		const long = `${"x".repeat(81)}\n\nmore`;
		expect(splitPost(long).title).toBeNull();
		expect(splitPost("Two lines\nin one paragraph\n\nmore").title).toBeNull();
	});
});

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
		expect(v.reactions[1]?.a11y).toBe("Love, 41, you reacted");
		expect(v.reactions[0]?.hint).toBe("Adds your reaction");
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

describe("channelBody", () => {
	it("waits for Stream and the channel's state, and offers a retry on failure", () => {
		expect(channelBody("connecting", false)).toBe("connecting");
		expect(channelBody("ready", false)).toBe("connecting");
		expect(channelBody("ready", true)).toBe("messages");
		expect(channelBody("unavailable", true)).toBe("unavailable");
	});
});
