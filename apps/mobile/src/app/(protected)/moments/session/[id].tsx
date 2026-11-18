import { useLocalSearchParams } from "expo-router";
import { MomentData } from "@/features/you/moments/moment/moment-data";
import { MomentGuard } from "@/features/you/moments/moment/moment-guard";
import { MomentScreen } from "@/features/you/moments/moment/moment-screen";

/** A moment (was `/timeline/session/[id]`), opened from Moments with Apple's zoom. */
export default function MomentRoute() {
	const { id } = useLocalSearchParams<{ id?: string }>();
	return (
		<MomentGuard id={id}>
			<MomentData id={id}>
				<MomentScreen />
			</MomentData>
		</MomentGuard>
	);
}
