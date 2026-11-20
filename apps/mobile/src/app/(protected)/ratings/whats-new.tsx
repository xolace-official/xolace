import { WhatsNewScreen } from "@/features/ratings/whats-new/whats-new-screen";
import { WhatsNewData } from "@/features/ratings/whats-new-data";

/** What's New. `?next=rate` (a plain open with the rating screen due) goes on to it on Continue. */
export default function WhatsNewRoute() {
	return (
		<WhatsNewData>
			<WhatsNewScreen />
		</WhatsNewData>
	);
}
