import { RateScreen } from "@/features/ratings/rate/rate-screen";
import { RateData } from "@/features/ratings/rate-data";

/** Help someone find Xolace. `?from=whatsnew` closes past What's New too. */
export default function RateRoute() {
	return (
		<RateData>
			<RateScreen />
		</RateData>
	);
}
