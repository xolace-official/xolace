import { describe, expect, it } from "vitest";
import { diffViews, hashField, listField } from "./diff";

describe("diffViews", () => {
	it("tells a list from the same items joined differently", () => {
		const changes = diffViews(
			{ Tags: listField(["calm, sleep"]) },
			{ Tags: listField(["calm", "sleep"]) }
		);
		expect(changes).toHaveLength(1);
		expect(changes[0]?.field).toBe("Tags");
	});

	it("tells hashes apart that share their shown prefix", () => {
		const shared = "abcdef12";
		const changes = diffViews(
			{ Audio: hashField(`${shared}${"0".repeat(56)}`) },
			{ Audio: hashField(`${shared}${"1".repeat(56)}`) }
		);
		expect(changes).toHaveLength(1);
		expect(changes[0]?.after).toBe(`${shared}${"1".repeat(56)}`);
	});

	it("reads equal lists and hashes as unchanged", () => {
		expect(
			diffViews(
				{ Audio: hashField("a".repeat(64)), Tags: listField(["calm"]) },
				{ Audio: hashField("a".repeat(64)), Tags: listField(["calm"]) }
			)
		).toEqual([]);
		expect(
			diffViews({ Tags: listField([]) }, { Tags: listField(undefined) })
		).toEqual([]);
	});
});
