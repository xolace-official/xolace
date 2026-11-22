import { RateScreen } from "@/features/ratings/rate/rate-screen";
import { RateData } from "@/features/ratings/rate-data";

export default function RateRoute() {
	return (
		<RateData>
			<RateScreen />
		</RateData>
	);
}
