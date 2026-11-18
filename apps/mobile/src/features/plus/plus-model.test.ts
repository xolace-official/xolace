import { describe, expect, it } from "vitest";
import { FEATURES } from "./copy";
import { featureRows, footerFlows, surfaceLine } from "./plus-model";

describe("surfaceLine", () => {
	it("names the companion in a surface's own line", () => {
		expect(surfaceLine("talk_door", "Flux")).toBe(
			"Xolace+ lets you talk it through out loud with Flux. When you finish, the whole talk becomes your mirror."
		);
	});

	it("is null for a surface without a line, or none at all", () => {
		expect(surfaceLine("settings_row", "Flux")).toBeNull();
		expect(surfaceLine(undefined, "Flux")).toBeNull();
	});
});

describe("featureRows", () => {
	it("leads with and marks the feature the surface opened it for", () => {
		const rows = featureRows("premium_theme");
		expect(rows[0]).toMatchObject({ highlighted: true, id: "themes" });
		expect(rows.filter((r) => r.highlighted)).toHaveLength(1);
		expect(rows).toHaveLength(FEATURES.length);
	});

	it("keeps production's order and marks nothing for a generic way in", () => {
		const rows = featureRows("settings_row");
		expect(rows.map((r) => r.id)).toEqual(FEATURES.map((f) => f.id));
		expect(rows.some((r) => r.highlighted)).toBe(false);
		expect(featureRows(undefined).some((r) => r.highlighted)).toBe(false);
	});
});

describe("footerFlows", () => {
	it("keeps the footer fixed up to the largest standard text size", () => {
		expect(footerFlows(1)).toBe(false);
		expect(footerFlows(1.353)).toBe(false);
	});

	it("lets the footer scroll at the accessibility sizes", () => {
		expect(footerFlows(1.647)).toBe(true);
		expect(footerFlows(3.1)).toBe(true);
	});
});
