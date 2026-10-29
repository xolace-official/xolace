import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";

/**
 * Hard publish gates (#392, #404), shared with the one-off `setActive`:
 * a first-hand story needs recorded consent to exist at all; an explainer
 * needs a safety review of its current body to be active.
 */
export function assertPublishable(
	e: Pick<
		Doc<"library_entries">,
		| "slug"
		| "kind"
		| "reuse"
		| "active"
		| "consentRecordedAt"
		| "safetyReviewedAt"
	>
) {
	if (
		e.kind === "story" &&
		e.reuse === "original" &&
		e.consentRecordedAt === undefined
	) {
		throw new ConvexError(
			`library entry "${e.slug}": first-hand story has no consentRecordedAt`
		);
	}
	if (e.kind === "explainer" && e.active && e.safetyReviewedAt === undefined) {
		throw new ConvexError(
			`library entry "${e.slug}": explainer has no safetyReviewedAt for its current body — ingest it ` +
				"with active: false, then run library/admin:markSafetyReviewed"
		);
	}
}
