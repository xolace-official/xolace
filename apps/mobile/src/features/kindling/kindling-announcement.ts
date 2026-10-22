export type KindlingAnnouncement = "plus" | "free" | "none";

/**
 * Whether the post-activity kindling announcement shows, and which CTA
 * (#455). Same gate as `KindlingCloseSlot`: `qualifies` is
 * `paths.isKindlingQualifyingSession` (`supportNeed` light/active,
 * docs/paths-v1.md §1), so the rule lives server-side once. Escalation isn't
 * re-checked — the classifier already forces `supportNeed` to "none".
 *
 * Takes `isPlus`/`isResolved` straight from `usePlusEntitlement` (whose
 * `isPlus` is false while loading): anything unresolved returns "none" rather
 * than "free" so a subscriber never sees the upsell flash.
 */
export function shouldOfferKindlingAnnouncement({
  qualifies,
  isPlus,
  isResolved,
}: {
  qualifies: boolean | undefined;
  isPlus: boolean;
  isResolved: boolean;
}): KindlingAnnouncement {
  if (!isResolved || !qualifies) return "none";
  return isPlus ? "plus" : "free";
}
