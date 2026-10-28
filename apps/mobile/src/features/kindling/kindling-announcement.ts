export type KindlingAnnouncement = "plus" | "free" | "none";

/** Whether the post-activity kindling announcement shows, and which CTA (#455).
 * Same gate as `KindlingCloseSlot` (`paths.isKindlingQualifyingSession`).
 * Unresolved entitlement returns "none", so a subscriber never sees the upsell flash. */
export function shouldOfferKindlingAnnouncement({
	qualifies,
	isPlus,
	isResolved,
}: {
	qualifies: boolean | undefined;
	isPlus: boolean;
	isResolved: boolean;
}): KindlingAnnouncement {
	if (!(isResolved && qualifies)) {
		return "none";
	}
	return isPlus ? "plus" : "free";
}
