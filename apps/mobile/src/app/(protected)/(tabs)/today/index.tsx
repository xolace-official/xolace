import { View } from "react-native";
import { ComingBack } from "@/features/follow-up/coming-back/coming-back";
import { FindingCard } from "@/features/intake/finding-card";
import { TodayData } from "@/features/today/today-data";
import { TodayScreen } from "@/features/today/today-screen";

/**
 * The Today tab, the app's landing: Today on its data, with the intake's day-3 question
 * composed in, and what greets someone coming back (check-in, return welcome, streak held,
 * the in-app banner) over it.
 */
export default function TodayRoute() {
	return (
		<View className="flex-1">
			<TodayData>
				<TodayScreen finding={<FindingCard />} />
			</TodayData>
			<ComingBack />
		</View>
	);
}
