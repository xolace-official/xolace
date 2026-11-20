import { WhatsNewScreen } from "@/features/ratings/whats-new/whats-new-screen";
import { WhatsNewData } from "@/features/ratings/whats-new-data";

export default function WhatsNewRoute() {
	return (
		<WhatsNewData>
			<WhatsNewScreen />
		</WhatsNewData>
	);
}
