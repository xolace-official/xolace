import { describe, expect, it } from "vitest";
import {
	badgeCard,
	CARD,
	CARD_PX,
	canShareBadge,
	captureScale,
	offeredName,
} from "@/features/achievements/share/badge-card-model";

const EARNED_AT = Date.UTC(2026, 10, 4, 12);
const badge = {
	achievementId: "streak-10",
	art: { fallback: false, thumbhash: null, url: "https://cdn.test/s10.png" },
	copy: "Ten days. You keep coming back.",
	earnedAt: EARNED_AT,
	title: "10 days by the fire",
};
const locale = "en-GB";

describe("canShareBadge", () => {
	it("shares an unlocked badge, never a locked one", () => {
		expect(canShareBadge({ earnedAt: EARNED_AT })).toBe(true);
		expect(canShareBadge({})).toBe(false);
	});
});

describe("badgeCard", () => {
	it("says what was unlocked and when, with the family's colours", () => {
		const card = badgeCard(badge, { includeName: false, locale });
		expect(card).toMatchObject({
			date: "Unlocked on 4 November 2026",
			family: "night",
			id: "streak-10",
			title: "10 days by the fire",
		});
		expect(card?.art).toEqual({
			source: "https://cdn.test/s10.png",
			thumbhash: null,
			unlit: false,
		});
	});

	it("keeps the old text as the message for a share without the image", () => {
		expect(badgeCard(badge, { includeName: false, locale })?.message).toBe(
			"10 days by the fire · Unlocked on 4 November 2026 · Xolace"
		);
	});

	it("leaves the name off unless it is asked for", () => {
		const off = badgeCard(badge, {
			displayName: "Quiet Fern",
			includeName: false,
			locale,
		});
		expect(off?.name).toBeNull();
		expect(off?.label).not.toContain("Quiet Fern");
		const on = badgeCard(badge, {
			displayName: "  Quiet Fern ",
			includeName: true,
			locale,
		});
		expect(on?.name).toBe("Quiet Fern");
		expect(on?.label).toContain("Quiet Fern");
	});

	it("draws no name when there is none to draw, even when asked", () => {
		expect(
			badgeCard(badge, { displayName: "   ", includeName: true, locale })?.name
		).toBeNull();
	});

	it("makes no card for a locked or missing badge", () => {
		expect(
			badgeCard({ ...badge, earnedAt: undefined }, { includeName: false })
		).toBeNull();
		expect(badgeCard(null, { includeName: false })).toBeNull();
		expect(badgeCard(undefined, { includeName: false })).toBeNull();
	});
});

describe("offeredName", () => {
	it("offers the trimmed display name, or nothing", () => {
		expect(offeredName(" Ember Owl ")).toBe("Ember Owl");
		expect(offeredName("")).toBeNull();
		expect(offeredName(undefined)).toBeNull();
		expect(offeredName(null)).toBeNull();
	});
});

describe("captureScale", () => {
	it("draws the card at 1080 px wide on any density", () => {
		for (const ratio of [1, 2, 2.625, 3]) {
			expect(CARD.width * captureScale(ratio) * ratio).toBeCloseTo(
				CARD_PX.width
			);
		}
	});

	it("keeps the saved image square", () => {
		expect(CARD.height).toBe(CARD.width);
		expect(CARD_PX.height).toBe(CARD_PX.width);
	});
});
