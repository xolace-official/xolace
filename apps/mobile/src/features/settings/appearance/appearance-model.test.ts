import { describe, expect, it } from "vitest";
import { FREE_THEMES, PREMIUM_THEMES } from "@/design/themes";
import {
	cardFlip,
	hiddenCards,
	modeNote,
	modeTheme,
	motionNote,
	PICKER_THEMES,
	pickMode,
	profileRows,
	STRIP,
	stripStart,
	themeCards,
	themeNote,
	themeTap,
} from "@/features/settings/appearance/appearance-model";
import {
	APPEARANCE_DARK_ROSE,
	APPEARANCE_FREE,
	APPEARANCE_TOP,
} from "@/features/settings/appearance/dev/fixtures";

describe("mode", () => {
	it("says what each mode does; System names the phone's mode now", () => {
		expect(modeNote("system", false)).toBe(
			"Follows your phone. It’s light right now."
		);
		expect(modeNote("system", true)).toBe(
			"Follows your phone. It’s dark right now."
		);
		expect(modeNote("light", true)).toBe(
			"Always light, whatever your phone is set to."
		);
		expect(modeNote("dark", false)).toBe(
			"Always dark, whatever your phone is set to."
		);
	});

	it("System hands Uniwind 'system'; Light and Dark keep the theme on screen", () => {
		expect(modeTheme("system", "rose-dark")).toBe("system");
		expect(modeTheme("dark", "rose-light")).toBe("rose-dark");
		expect(modeTheme("light", "dark")).toBe("light");
		// Anything the registry doesn't know falls back to Default.
		expect(modeTheme("dark", "system")).toBe("dark");
	});

	it("a picked theme is drawn in the stored mode, or what System shows", () => {
		expect(pickMode("system", "dark")).toBe("dark");
		expect(pickMode("light", "dark")).toBe("light");
	});
});

describe("motionNote", () => {
	it("Match my phone leads with the phone's setting", () => {
		expect(motionNote("system", false)).toBe(
			"Follows your phone’s Reduce Motion, which is off. Everything stays gently in motion, including the breathing exercise."
		);
		expect(motionNote("system", true)).toMatch(
			/^Follows your phone’s Reduce Motion, which is on\. Fluid motion is calmed\./
		);
	});

	it("Reduced is calmed; Full says so when the phone asks to reduce", () => {
		expect(motionNote("reduced", false)).toMatch(/^Fluid motion is calmed\./);
		expect(motionNote("full", true)).toBe(
			"Your phone asks apps to reduce motion, but Xolace will stay fully animated."
		);
		expect(motionNote("full", false)).toBe(
			"Everything stays gently in motion, including the breathing exercise."
		);
	});
});

describe("themes", () => {
	it("lists the registry's picker themes, free first, the divider before Plus", () => {
		const cards = themeCards("default", true);
		expect(cards.map((c) => c.id)).toEqual(PICKER_THEMES.map((t) => t.id));
		expect(cards.filter((c) => c.firstPlus).map((c) => c.id)).toEqual([
			PREMIUM_THEMES[0].id,
		]);
		expect(cards.find((c) => c.active)?.id).toBe("default");
	});

	it("keeps the copy's counts true: four free, six Plus", () => {
		expect(FREE_THEMES).toHaveLength(4);
		expect(PREMIUM_THEMES).toHaveLength(6);
	});

	it("locks Plus themes on a free account, and says so", () => {
		const noir = themeCards("default", false).find((c) => c.id === "noir");
		expect(noir).toMatchObject({
			a11y: "Noir theme, Xolace+, locked",
			locked: true,
		});
		expect(
			themeCards("default", true).find((c) => c.id === "noir")
		).toMatchObject({ a11y: "Noir theme, Xolace+", locked: false });
		expect(themeTap("noir", false)).toBe("locked");
		expect(themeTap("noir", true)).toBe("pick");
		expect(themeTap("quiet", false)).toBe("pick");
	});

	it("notes the theme on Plus, the line when free", () => {
		expect(themeNote("default", true)).toBe(
			"Default. Four themes are free; Xolace+ adds six."
		);
		expect(themeNote("rose", true)).toBe(
			"Rosé, from Xolace+. Four themes are free; Xolace+ adds six."
		);
		expect(themeNote("rose", false)).toBe(
			"Four themes are free. The six after the line come with Xolace+."
		);
		expect(themeNote("gone", true)).toMatch(/^Default\./);
	});

	it("opens with the active card in view, past the divider for Plus themes", () => {
		expect(stripStart("default")).toBe(0);
		expect(stripStart("reverie")).toBe(0);
		const step = STRIP.cardW + STRIP.gap;
		expect(stripStart("human")).toBe(STRIP.inset + 3 * step - 30);
		expect(stripStart("emerald")).toBe(
			STRIP.inset + 4 * step + STRIP.divider + STRIP.gap - 30
		);
		expect(stripStart("gone")).toBe(0);
	});
});

describe("profile cards", () => {
	it("hides a card hidden on the account or on this device", () => {
		expect(hiddenCards(["rank"], ["week"])).toEqual(["rank", "week"]);
		expect(hiddenCards(undefined, ["rank"])).toEqual(["rank"]);
		expect(profileRows(["rank"])).toEqual([
			{ id: "calendar", label: "Your days", shown: true },
			{ id: "rank", label: "Among the fires", shown: false },
			{ id: "week", label: "This week", shown: true },
		]);
	});

	it("showing a card hidden only on this device clears it there too", () => {
		expect(cardFlip("rank", true, ["rank"])).toEqual({
			forgetOnDevice: true,
			hidden: false,
		});
		expect(cardFlip("week", false, [])).toEqual({
			forgetOnDevice: false,
			hidden: true,
		});
	});
});

describe("fixtures", () => {
	it("match the renders' states", () => {
		expect(APPEARANCE_TOP.themes.find((c) => c.active)?.id).toBe("default");
		expect(APPEARANCE_FREE.themes.some((c) => c.locked)).toBe(true);
		expect(APPEARANCE_DARK_ROSE.themeNote).toMatch(/^Rosé, from Xolace\+/);
	});
});
