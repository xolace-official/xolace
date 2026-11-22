import { MomentsData } from "@/features/you/moments/moments-data";
import { MomentsScreen } from "@/features/you/moments/moments-screen";

export default function MomentsRoute() {
	return (
		<MomentsData>
			<MomentsScreen />
		</MomentsData>
	);
}
