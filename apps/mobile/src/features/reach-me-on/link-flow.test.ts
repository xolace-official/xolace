import { describe, expect, it } from "vitest";
import {
	canReuseLink,
	isLinking,
	LINK_LIFETIME_MINUTES,
	type LinkStep,
	linkFlow,
} from "@/features/reach-me-on/link-flow";

const run = (...events: Parameters<typeof linkFlow>[1][]): LinkStep =>
	events.reduce<LinkStep>(linkFlow, "idle");

describe("linkFlow", () => {
	it("starts at the disclosure", () => {
		expect(run({ type: "start" })).toBe("disclose");
	});

	it("waits for Start once the link is opened or copied", () => {
		expect(run({ type: "start" }, { type: "link_handed_off" })).toBe("waiting");
	});

	it("advances to linked when the backend links the chat", () => {
		expect(
			run(
				{ type: "start" },
				{ type: "link_handed_off" },
				{ linked: true, type: "channel_changed" }
			)
		).toBe("linked");
	});

	it("keeps waiting while the chat isn't linked yet", () => {
		expect(
			run(
				{ type: "start" },
				{ type: "link_handed_off" },
				{ linked: false, type: "channel_changed" }
			)
		).toBe("waiting");
	});

	it("goes back to the card on Cancel", () => {
		expect(
			run({ type: "start" }, { type: "link_handed_off" }, { type: "cancel" })
		).toBe("idle");
	});

	it("closes the confirmation", () => {
		expect(
			run(
				{ type: "start" },
				{ type: "link_handed_off" },
				{ linked: true, type: "channel_changed" },
				{ type: "dismiss" }
			)
		).toBe("idle");
	});

	it("stays linked when the link's handoff finishes after the chat linked", () => {
		expect(
			run(
				{ type: "start" },
				{ linked: true, type: "channel_changed" },
				{ type: "link_handed_off" }
			)
		).toBe("linked");
	});

	it("ignores a channel update when no link is in progress", () => {
		expect(run({ linked: true, type: "channel_changed" })).toBe("idle");
	});

	it("says the link expired while waiting past its lifetime", () => {
		expect(
			run(
				{ type: "start" },
				{ type: "link_handed_off" },
				{ type: "link_expired" }
			)
		).toBe("expired");
	});

	it("waits again once a fresh link is handed off", () => {
		expect(
			run(
				{ type: "start" },
				{ type: "link_handed_off" },
				{ type: "link_expired" },
				{ type: "link_handed_off" }
			)
		).toBe("waiting");
	});

	it("ignores an expiry before the link is handed off", () => {
		expect(run({ type: "start" }, { type: "link_expired" })).toBe("disclose");
	});

	it("still links when the chat links after the link expired", () => {
		expect(
			run(
				{ type: "start" },
				{ type: "link_handed_off" },
				{ type: "link_expired" },
				{ linked: true, type: "channel_changed" }
			)
		).toBe("linked");
	});

	it("counts the expired step as mid-link", () => {
		expect(isLinking("expired")).toBe(true);
	});
});

describe("canReuseLink", () => {
	const MINUTE = 60_000;
	const mintedAt = 1_000_000;

	it("reuses a link with plenty of time left", () => {
		expect(canReuseLink(mintedAt, mintedAt + 2 * MINUTE)).toBe(true);
	});

	it("mints again when a link has only a few minutes left", () => {
		expect(canReuseLink(mintedAt, mintedAt + 13 * MINUTE)).toBe(false);
	});

	it("never reuses an expired link", () => {
		expect(
			canReuseLink(mintedAt, mintedAt + LINK_LIFETIME_MINUTES * MINUTE)
		).toBe(false);
	});
});
