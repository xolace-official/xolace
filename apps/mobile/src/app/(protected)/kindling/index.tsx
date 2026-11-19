import { KindlingData } from "@/features/kindling/kindling-data";
import { KindlingScreen } from "@/features/kindling/kindling-screen";

export default function KindlingRoute() {
	return (
		<KindlingData>
			<KindlingScreen />
		</KindlingData>
	);
}
