import { FollowUpData } from "@/features/session-end/follow-up/follow-up-data";
import { FollowUpSheet } from "@/features/session-end/follow-up/follow-up-sheet";

/** The heavier follow-up, a form sheet over the session end. */
export default function SessionFollowUp() {
	return (
		<FollowUpData>
			<FollowUpSheet />
		</FollowUpData>
	);
}
