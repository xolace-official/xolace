import type { PublishGate } from "./publish-gate";
import type { ContentStatus } from "./status-badge";

/**
 * Status is derived from the row, never stored (docs/plan/admin-v1.md, "Item status"):
 * live while `active`, retired once taken down after being live, and otherwise a
 * draft, or "needs review" when one of the review gates (safety review, consent, alt
 * text) blocks it. Queued / processing / failed come from processing, with uploads.
 */
export function deriveStatus(
	row: { active: boolean; retiredAt?: number },
	gates: readonly PublishGate[] = [],
	reviewGates: readonly string[] = []
): ContentStatus {
	if (row.active) {
		return "live";
	}
	if (row.retiredAt !== undefined) {
		return "retired";
	}
	const blocked = gates.some(
		(gate) =>
			gate.required && gate.state === "fail" && reviewGates.includes(gate.id)
	);
	return blocked ? "needs_review" : "draft";
}
