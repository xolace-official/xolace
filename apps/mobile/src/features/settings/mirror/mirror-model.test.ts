import { describe, expect, it } from "vitest";
import {
	MIRROR_FREE,
	MIRROR_FREE_SAGE,
	MIRROR_WREN_PLAYING,
} from "@/features/settings/mirror/dev/fixtures";
import {
	cardInk,
	cardName,
	entitlementOf,
	opensAtEnd,
	orbA11y,
	orbTap,
	shownTone,
	shownVoice,
	talkTap,
	toneA11y,
	toneTap,
	voiceLine,
} from "@/features/settings/mirror/mirror-model";

describe("entitlement", () => {
	it("is Plus once either source says so, else loading, else free", () => {
		expect(entitlementOf(true, true)).toBe("plus");
		expect(entitlementOf(false, true)).toBe("loading");
		expect(entitlementOf(false, false)).toBe("free");
	});

	it("shows what the server does off Plus: Adaptive for Witnessed, Auto for a voice", () => {
		expect(shownTone("witnessed", "free")).toBe("adaptive");
		expect(shownTone("witnessed", "loading")).toBe("witnessed");
		expect(shownTone("poetic", "free")).toBe("poetic");
		expect(shownVoice("sage", "free")).toBe("auto");
		expect(shownVoice("sage", "plus")).toBe("sage");
	});
});

describe("toneTap", () => {
	it("chooses a tone, and does nothing on the chosen one", () => {
		expect(toneTap("poetic", "gentle", "free")).toBe("choose");
		expect(toneTap("gentle", "gentle", "plus")).toBe("none");
		expect(toneTap("witnessed", "gentle", "plus")).toBe("choose");
	});

	it("compares with the saved tone: a lapsed Witnessed is replaced by tapping Adaptive", () => {
		expect(toneTap("adaptive", "witnessed", "free")).toBe("choose");
		expect(toneTap("adaptive", "adaptive", "free")).toBe("none");
	});

	it("only shows Witnessed off Plus, and waits while Plus loads", () => {
		expect(toneTap("witnessed", "gentle", "free")).toBe("peek");
		expect(toneTap("witnessed", "gentle", "loading")).toBe("wait");
	});
});

describe("orbTap", () => {
	const plus = {
		playing: null,
		plus: "plus" as const,
		saved: { voice: "auto" as const },
		voice: "auto" as const,
	};

	it("Auto: chosen, and any clip stops", () => {
		expect(
			orbTap("auto", { ...plus, saved: { voice: "sage" }, voice: "sage" })
		).toEqual({
			choose: "auto",
			focus: null,
			preview: "stop",
		});
		expect(orbTap("auto", plus).choose).toBeNull();
	});

	it("Plus: a new voice is chosen and played", () => {
		expect(orbTap("wren", plus)).toEqual({
			choose: "wren",
			focus: null,
			preview: { play: "wren" },
		});
	});

	it("Plus: the chosen voice stops or plays again", () => {
		const s = { ...MIRROR_WREN_PLAYING, plus: "plus" as const };
		expect(orbTap("wren", s)).toEqual({
			choose: null,
			focus: null,
			preview: "stop",
		});
		expect(orbTap("wren", { ...s, playing: null }).preview).toEqual({
			play: "wren",
		});
	});

	it("free: Auto replaces a lapsed subscriber's saved voice, shown as Auto", () => {
		const lapsed = {
			...MIRROR_FREE,
			saved: { tone: "poetic" as const, voice: "sage" as const },
		};
		expect(orbTap("auto", lapsed).choose).toBe("auto");
		expect(orbTap("auto", MIRROR_FREE).choose).toBeNull();
	});

	it("free: a named voice only plays, and the line describes it", () => {
		expect(orbTap("sage", MIRROR_FREE)).toEqual({
			choose: null,
			focus: "sage",
			preview: { play: "sage" },
		});
		expect(orbTap("sage", MIRROR_FREE_SAGE).preview).toBe("stop");
	});
});

describe("talkTap", () => {
	it("picks and plays; the chosen one playing stops", () => {
		expect(talkTap("ash", { playing: null, voice: "vesper" })).toEqual({
			choose: true,
			preview: { play: "ash" },
		});
		expect(talkTap("vesper", { playing: "vesper", voice: "vesper" })).toEqual({
			choose: false,
			preview: "stop",
		});
	});
});

describe("words", () => {
	it("names Witnessed with Xolace+ on the card", () => {
		expect(cardName("witnessed")).toBe("Witnessed · Xolace+");
		expect(cardName("gentle")).toBe("Gentle");
	});

	it("says what the voice line says", () => {
		expect(voiceLine("auto", "gentle", "plus")).toEqual({
			name: "Auto",
			seePlus: false,
			text: "Speaks in the voice made for Gentle.",
		});
		expect(voiceLine("wren", "gentle", "plus").text).toBe(
			"Soft-spoken, with a gentle lilt. Easy to sit with."
		);
		expect(voiceLine("sage", "gentle", "free")).toMatchObject({
			seePlus: true,
			text: "Older and unhurried. Like someone who's heard a lot and isn't in a rush. Comes with Xolace+.",
		});
	});

	it("reads pills and orbs for VoiceOver", () => {
		expect(toneA11y("witnessed", "free")).toBe("Witnessed, Xolace+, locked");
		expect(toneA11y("witnessed", "plus")).toBe("Witnessed, Xolace+");
		expect(toneA11y("gentle", "free")).toBe("Gentle");
		expect(orbA11y("sage", "free")).toBe("Sage, Xolace+");
		expect(orbA11y("sage", "plus")).toBe("Sage");
		expect(orbA11y("auto", "free")).toBe("Auto");
	});
});

describe("the card's look", () => {
	it("inks the light cards dark and Direct follows the mode", () => {
		expect(cardInk("gentle", true)).toMatchObject({
			edge: null,
			ink: "mirror-ink-gentle",
		});
		expect(cardInk("direct", false)).toMatchObject({
			edge: "on-light",
			ink: "mirror-ink-direct",
		});
		expect(cardInk("direct", true)).toMatchObject({
			chip: "on-direct-dark",
			ink: "mirror-ink-direct-dark",
		});
		expect(cardInk("poetic", true)).toMatchObject({
			chip: "on-dark",
			ink: "on-art",
		});
	});

	it("opens the pill row at its end for Direct and Witnessed", () => {
		expect(opensAtEnd("gentle")).toBe(false);
		expect(opensAtEnd("direct")).toBe(true);
		expect(opensAtEnd("witnessed")).toBe(true);
	});
});
