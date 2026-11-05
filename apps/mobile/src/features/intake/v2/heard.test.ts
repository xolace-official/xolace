import { describe, expect, it } from "vitest";
import {
	CHIP_GROUPS,
	chipChanges,
	completeArgs,
	echoOf,
	type Heard,
	isOn,
	NOTHING_HEARD,
	suggestionsTaken,
	toggleChip,
} from "@/features/intake/v2/heard";

describe("toggleChip", () => {
	it("swaps a single-select for the new pick", () => {
		const once = toggleChip(NOTHING_HEARD, {
			field: "intent",
			value: "feel_less_alone",
		});
		expect(
			toggleChip(once, { field: "intent", value: "just_looking" }).intent
		).toBe("just_looking");
	});

	it("clears a single-select tapped again", () => {
		const once = toggleChip(NOTHING_HEARD, {
			field: "disclosureStyle",
			value: "keep_it_brief",
		});
		expect(
			toggleChip(once, { field: "disclosureStyle", value: "keep_it_brief" })
				.disclosureStyle
		).toBeUndefined();
	});

	it("holds weighing-on at three by dropping the oldest", () => {
		const heard: Heard = { weighingOn: ["work", "family", "money"] };
		expect(
			toggleChip(heard, { field: "weighingOn", value: "health" }).weighingOn
		).toEqual(["family", "money", "health"]);
	});

	it("drops a weighing-on chip tapped off", () => {
		const heard: Heard = { weighingOn: ["work", "family"] };
		expect(
			toggleChip(heard, { field: "weighingOn", value: "work" }).weighingOn
		).toEqual(["family"]);
	});
});

describe("CHIP_GROUPS", () => {
	it("groups the four fields as the design does", () => {
		expect(
			CHIP_GROUPS.map((g) => [
				g.label,
				[...new Set(g.chips.map((c) => c.field))],
			])
		).toEqual([
			["Why you came", ["intent"]],
			["Weighing on you", ["weighingOn"]],
			["How you put it", ["disclosureStyle", "emotionAwareness"]],
		]);
	});

	it("never offers a decline: an unpicked chip already means not told", () => {
		const values = CHIP_GROUPS.flatMap((g) => g.chips.map((c) => c.value));
		expect(values).not.toContain("prefer_not_to_say");
	});
});

describe("isOn", () => {
	it("reads single and multi fields", () => {
		const heard: Heard = { intent: "feel_less_alone", weighingOn: ["work"] };
		expect(isOn(heard, { field: "intent", value: "feel_less_alone" })).toBe(
			true
		);
		expect(isOn(heard, { field: "weighingOn", value: "family" })).toBe(false);
	});
});

describe("chipChanges", () => {
	it("counts chips tapped off and on against what was read", () => {
		const read: Heard = {
			intent: "get_through_hard_moment",
			weighingOn: ["work", "health"],
		};
		const final: Heard = {
			emotionAwareness: "something_off_unclear",
			intent: "get_through_hard_moment",
			weighingOn: ["work"],
		};
		expect(chipChanges(read, final)).toEqual({
			added: 1,
			kept: 2,
			removed: 1,
		});
	});

	it("counts every pick as added on an empty pick-list", () => {
		expect(
			chipChanges(NOTHING_HEARD, { intent: "just_looking", weighingOn: [] })
		).toEqual({ added: 1, kept: 0, removed: 0 });
	});
});

describe("suggestionsTaken", () => {
	it("counts only the suggested chips that ended up on", () => {
		const suggested: Heard = {
			intent: "get_through_hard_moment",
			weighingOn: ["relationships", "purpose"],
		};
		const final: Heard = { weighingOn: ["purpose", "work"] };
		expect(suggestionsTaken(suggested, final)).toBe(1);
	});
});

describe("completeArgs", () => {
	it("sends the name and only the fields that were heard", () => {
		expect(
			completeArgs("Quiet Ember", { intent: "feel_less_alone", weighingOn: [] })
		).toEqual({ displayName: "Quiet Ember", intent: "feel_less_alone" });
	});

	it("sends weighing-on when something was picked", () => {
		expect(
			completeArgs("Quiet Ember", { weighingOn: ["work"] }).weighingOn
		).toEqual(["work"]);
	});
});

describe("echoOf", () => {
	it("keeps a short answer whole", () => {
		expect(echoOf("Work's been a lot")).toBe("Work's been a lot");
	});

	it("cuts a long one to its first seven words", () => {
		expect(
			echoOf("Honestly work has been a lot. I keep saying I'm fine but I'm not")
		).toBe("Honestly work has been a lot. I…");
	});
});
