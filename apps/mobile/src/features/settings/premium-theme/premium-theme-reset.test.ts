import { describe, expect, it } from "vitest";
import { planPremiumThemeReset } from "./premium-theme-reset";

const LAPSE = {
	colorThemeId: "velvet",
	currentTheme: "velvet-dark",
	isPlus: false,
	isResolved: true,
	previousTheme: null,
	storedTheme: "dark",
};

describe("planPremiumThemeReset", () => {
	it("never revokes before the entitlement resolves", () => {
		expect(planPremiumThemeReset({ ...LAPSE, isResolved: false })).toBeNull();
	});

	it("never revokes an active Plus user", () => {
		expect(planPremiumThemeReset({ ...LAPSE, isPlus: true })).toBeNull();
	});

	it("is a no-op on a free theme", () => {
		expect(
			planPremiumThemeReset({ ...LAPSE, colorThemeId: "default" })
		).toBeNull();
	});

	it("re-applies the stored base on a live premium theme", () => {
		expect(planPremiumThemeReset(LAPSE)).toEqual({
			applyBaseTheme: "dark",
			clearPreviousTheme: false,
		});
	});

	it("clears a premium theme stashed by night mode", () => {
		expect(
			planPremiumThemeReset({ ...LAPSE, previousTheme: "velvet-dark" })
		).toEqual({ applyBaseTheme: "dark", clearPreviousTheme: true });
	});

	it("leaves the live theme alone when nightly is applied", () => {
		expect(
			planPremiumThemeReset({ ...LAPSE, currentTheme: "nightly-dark" })
		).toEqual({ applyBaseTheme: null, clearPreviousTheme: false });
	});
});
