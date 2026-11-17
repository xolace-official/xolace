import { describe, expect, it } from "vitest";
import {
	badgesView,
	freezeView,
	heldHint,
	pinRefusal,
	pinRefused,
	tileLabel,
} from "@/features/achievements/badges/badges-model";
import { OVERVIEW, SHELF } from "@/features/achievements/dev/fixtures";

const view = badgesView(OVERVIEW);
const badge = (id: string) => {
	const b = view.byId.get(id);
	if (!b) {
		throw new Error(`no ${id} in the fixture`);
	}
	return b;
};

describe("badgesView", () => {
	it("counts each row's unlocked badges (badges §1)", () => {
		expect(view.categories.map((c) => c.count)).toEqual([
			"2 of 2 unlocked",
			"4 of 25 unlocked",
			"2 of 8 unlocked",
			"2 of 14 unlocked",
			"1 of 3 unlocked",
		]);
	});

	it("writes the sparks card's lines", () => {
		expect(view.sparks.spend).toBe("145 to spend · 11 badges");
		expect(view.sparks.latest?.title).toBe("10 days by the fire");
		expect(view.sparks.nextUp).toMatchObject({
			current: 12,
			label: "12 of 14 days in a row",
			target: 14,
			title: "14 days by the fire",
		});
	});

	it("colours each badge by its row and counts the pins", () => {
		expect(badge("first-talk").family).toBe("green");
		expect(badge("showing-up-10").family).toBe("dawn");
		expect(view.pinnedCount).toBe(3);
	});

	it("gives only the next rung its progress", () => {
		expect(badge("streak-14").progress?.share).toBeCloseTo(12 / 14);
		expect(badge("streak-21").progress).toBeUndefined();
	});
});

describe("tileLabel", () => {
	it("says pinned for a pinned badge", () => {
		expect(tileLabel(badge("streak-10"))).toBe("10 days by the fire, pinned");
	});

	it("says locked and the progress for the next rung", () => {
		expect(tileLabel(badge("streak-14"))).toBe(
			"14 days by the fire, locked, 12 of 14 days in a row"
		);
	});
});

describe("heldHint", () => {
	it("tells an earned badge to drag, or tap under Reduce Motion", () => {
		expect(heldHint(true, false)).toBe(
			"Drag to turn it over · Swipe down to put it back"
		);
		expect(heldHint(true, true)).toBe(
			"Tap it to turn it over · Swipe down to put it back"
		);
	});

	it("only offers putting back a locked badge", () => {
		expect(heldHint(false, false)).toBe("Swipe down to put it back");
	});
});

describe("pins", () => {
	it("refuses a fourth pin, never an unpin", () => {
		expect(pinRefused(badge("showing-up-10"), 3)).toBe(true);
		expect(pinRefused(badge("showing-up-10"), 2)).toBe(false);
		expect(pinRefused(badge("streak-10"), 3)).toBe(false);
	});

	it("explains the server's refusals", () => {
		expect(pinRefusal("pin_limit_reached", true)).toBe(
			"You can pin 3 badges. Unpin one to pin this."
		);
		expect(pinRefusal(undefined, true)).toBe(
			"Couldn't pin this badge. Try again."
		);
		expect(pinRefusal(undefined, false)).toBe(
			"Couldn't unpin this badge. Try again."
		);
	});
});

describe("freezeView", () => {
	it("refuses at the cap, holding two", () => {
		expect(freezeView(SHELF)).toEqual({
			buy: "Buy a freeze · 50",
			line: "You're holding the max of 2 freezes.",
			reason: "You're holding the max of 2 freezes.",
		});
	});

	it("says how many it holds when a buy is open", () => {
		expect(freezeView({ ...SHELF, freezes: 1 })).toMatchObject({
			line: "Covers one missed day · you hold 1 of 2",
			reason: null,
		});
	});

	it("puts an ended streak first, then sparks short, as buyFreeze checks", () => {
		expect(
			freezeView({ ...SHELF, balance: 10, streakLapsed: true }).reason
		).toBe("Your streak ended. Show up today, then buy one.");
		expect(freezeView({ ...SHELF, balance: 49, freezes: 0 }).reason).toBe(
			"1 more spark to buy one."
		);
	});
});
