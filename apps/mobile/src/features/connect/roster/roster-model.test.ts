import { describe, expect, it } from "vitest";
import { CONVERSATIONS, DIRECTORY, PEOPLE } from "../dev/fixtures";
import { filterChips, presentIds, rosterCards } from "./roster-model";

describe("filterChips", () => {
	it("offers Everyone and the declared specialties in taxonomy order", () => {
		expect(filterChips(DIRECTORY, null).map((c) => c.label)).toEqual([
			"Everyone",
			"Anxiety",
			"Sleep",
			"Loneliness",
			"Grief",
			"Family",
			"Studies",
		]);
	});

	it("hides the row when there's under two to choose from", () => {
		expect(
			filterChips(
				DIRECTORY.slice(1, 2).map((x) => ({ ...x, specialties: ["grief"] })),
				null
			)
		).toEqual([]);
	});

	it("keeps an active filter nobody declares, so there's a way back", () => {
		expect(filterChips(DIRECTORY, "burnout").map((c) => c.slug)).toContain(
			"burnout"
		);
	});
});

describe("rosterCards", () => {
	it("reads presence as a word and the rating or New", () => {
		const [maya, kojo, esi] = rosterCards(DIRECTORY, [], null, null);
		expect(maya).toMatchObject({ presence: "Here now", rating: "★ 4.9" });
		expect(kojo).toMatchObject({
			presence: "Replies within a day",
			rating: null,
		});
		expect(esi).toMatchObject({ muted: true, presence: "Full right now" });
		expect(maya.tags).toEqual(["Anxiety", "Sleep", "Studies"]);
	});

	it("marks the Xolacers already talking with you", () => {
		const cards = rosterCards(DIRECTORY, CONVERSATIONS, null, null);
		expect(cards.find((c) => c.id === PEOPLE.maya)?.talking).toBe(true);
		expect(cards.find((c) => c.id === PEOPLE.kojo)?.talking).toBe(false);
		expect(cards.find((c) => c.id === PEOPLE.maya)?.a11y).toMatch(
			/^Maya, talking with you, Here now, rated 4\.9/
		);
		expect(cards.find((c) => c.id === PEOPLE.kojo)?.a11y).not.toMatch(
			/talking/
		);
	});

	it("filters by specialty, then lifts the snapshot's present people", () => {
		const cards = rosterCards(
			DIRECTORY,
			[],
			"studies",
			new Set<string>([PEOPLE.esi])
		);
		expect(cards.map((c) => c.name)).toEqual(["Esi", "Maya"]);
	});

	it("leaves the directory's own order alone", () => {
		const before = DIRECTORY.map((x) => x.displayName);
		rosterCards(DIRECTORY, [], null, presentIds(DIRECTORY));
		expect(DIRECTORY.map((x) => x.displayName)).toEqual(before);
	});
});
