import { describe, expect, it } from "vitest";
import { type LinkStep, linkFlow } from "@/features/reach-me-on/link-flow";

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

	it("ignores a channel update when no link is in progress", () => {
		expect(run({ linked: true, type: "channel_changed" })).toBe("idle");
	});
});
