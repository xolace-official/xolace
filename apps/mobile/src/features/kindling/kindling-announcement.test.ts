import { describe, expect, it } from "vitest";
import { shouldOfferKindlingAnnouncement } from "@/features/kindling/kindling-announcement";

/** Failure modes covered: a non-qualifying session shows the screen; Plus/free
 * swapped; unresolved entitlement read as free; loading qualification read as qualifying. */
const offer = (
	qualifies: boolean | undefined,
	isPlus: boolean,
	isResolved = true
) => shouldOfferKindlingAnnouncement({ isPlus, isResolved, qualifies });

describe("shouldOfferKindlingAnnouncement", () => {
	it.each([true, false])("not qualifying → none (isPlus %s)", (isPlus) => {
		expect(offer(false, isPlus)).toBe("none");
	});

	it("qualifying + plus → plus", () => {
		expect(offer(true, true)).toBe("plus");
	});

	it("qualifying + free → free", () => {
		expect(offer(true, false)).toBe("free");
	});

	it.each([true, false, undefined])(
		"%s + entitlement resolving → none",
		(qualifies) => {
			expect(offer(qualifies, false, false)).toBe("none");
			expect(offer(qualifies, true, false)).toBe("none");
		}
	);

	it.each([true, false])(
		"qualification loading → none (isPlus %s)",
		(isPlus) => {
			expect(offer(undefined, isPlus)).toBe("none");
		}
	);
});
