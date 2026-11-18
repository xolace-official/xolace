import { FindingCard } from "@/features/intake/finding-card";
import { TodayData } from "@/features/today/today-data";
import { TodayScreen } from "@/features/today/today-screen";

/** The Today tab: Today on its data, with the intake's day-3 question composed in. */
export default function TodayRoute() {
	return (
		<TodayData>
			<TodayScreen finding={<FindingCard />} />
		</TodayData>
	);
}
