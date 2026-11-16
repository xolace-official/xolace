import { describe, expect, it } from "vitest";
import { accentTile, rowLabel, tileBg, visibleLength } from "./settings-layout";

describe("tileBg", () => {
	it("tints the accent tile stronger in dark; danger and neutral don't follow the mode", () => {
		expect(tileBg("accent", false)).toBe(accentTile(false));
		expect(tileBg("accent", true)).toBe("bg-accent/22");
		expect(tileBg("danger", true)).toBe("bg-danger/13");
		expect(tileBg("neutral", false)).toBe("bg-surface-secondary");
	});
});

describe("rowLabel", () => {
	it("reads the row's words in order, skipping the missing ones", () => {
		expect(rowLabel("Email", undefined, "me@x.co")).toBe("Email, me@x.co");
		expect(rowLabel("Theme")).toBe("Theme");
	});
});

describe("visibleLength", () => {
	it("counts an emoji as one character, as the person sees it", () => {
		expect(visibleLength("Ember")).toBe(5);
		expect(visibleLength("🌙 Ember")).toBe(7);
	});
});
