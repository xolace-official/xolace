import { MomentsData } from "@/features/you/moments/moments-data";
import { MomentsScreen } from "@/features/you/moments/moments-screen";

/** Moments (was `/timeline`): every reflection's mirror, newest first. */
export default function MomentsRoute() {
	return (
		<MomentsData>
			<MomentsScreen />
		</MomentsData>
	);
}
