import { describe, expect, it } from "vitest";
import { routingOrder } from "./channels";

describe("routingOrder", () => {
	it("is the default order, then email, when the person has stored none", () => {
		expect(routingOrder(undefined)).toEqual(["push", "email"]);
		expect(routingOrder({})).toEqual(["push", "email"]);
	});

	it("is the stored order, then email, when one is stored", () => {
		expect(routingOrder({ channelOrder: ["telegram", "push"] })).toEqual([
			"telegram",
			"push",
			"email",
		]);
	});

	it("appends a channel linked at sign-up that the stored order doesn't list", () => {
		expect(routingOrder({ channelOrder: ["push"] }, ["telegram"])).toEqual([
			"push",
			"telegram",
		]);
		expect(routingOrder(undefined, ["telegram"])).toEqual(["push", "telegram"]);
	});

	it("keeps a sign-up channel where the stored order already puts it", () => {
		expect(
			routingOrder({ channelOrder: ["telegram", "push"] }, ["telegram"])
		).toEqual(["telegram", "push"]);
	});
});
