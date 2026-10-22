import { describe, expect, it } from "vitest";
import { shouldOfferKindlingAnnouncement } from "@/src/features/kindling/kindling-announcement";

/**
 * Ways this can fail (written before the function):
 * 1. A non-qualifying session (`supportNeed: "none"`) shows the screen — to
 *    a subscriber or a free user.
 * 2. Plus/free swapped: a subscriber gets the upsell, or a free user is told
 *    kindling is being set up.
 * 3. Entitlement still resolving (hook reports `isPlus: false` until settled)
 *    reads as free, flashing the upsell at a subscriber for a frame.
 * 4. Qualification still loading (`undefined`) is treated as qualifying.
 */
const offer = (qualifies: boolean | undefined, isPlus: boolean, isResolved = true) =>
  shouldOfferKindlingAnnouncement({ qualifies, isPlus, isResolved });

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

  it.each([true, false, undefined])("%s + entitlement resolving → none", (qualifies) => {
    expect(offer(qualifies, false, false)).toBe("none");
    expect(offer(qualifies, true, false)).toBe("none");
  });

  it.each([true, false])("qualification loading → none (isPlus %s)", (isPlus) => {
    expect(offer(undefined, isPlus)).toBe("none");
  });
});
