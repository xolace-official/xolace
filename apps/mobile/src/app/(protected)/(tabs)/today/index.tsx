import { View } from "react-native";
import { ComingBack } from "@/features/follow-up/coming-back/coming-back";
import { FindingCard } from "@/features/intake/finding-card";
import {
	useLaunchHold,
	useLaunchRevealed,
} from "@/features/launch/launch-store";
import { TodayData, useToday } from "@/features/today/today-data";
import { TodayScreen } from "@/features/today/today-screen";
import { useTodayHolds } from "@/features/today/use-today-hold";

/**
 * The Today tab, the app's landing: Today on its data, with the intake's day-3 question
 * composed in, and what greets someone coming back (check-in, return welcome, streak held,
 * the in-app banner) over it. At launch the cover waits for what Today draws above the fold.
 */
export default function TodayRoute() {
	const revealed = useLaunchRevealed();
	return (
		<View className="flex-1">
			<TodayData>
				<HoldForToday />
				<TodayScreen finding={<FindingCard />} revealed={revealed} />
			</TodayData>
			<ComingBack />
		</View>
	);
}

/**
 * Keeps the launch cover up until Today is drawn above the fold, within Today's budget and
 * never offline (`todayHolds`); after launch, nothing.
 */
function HoldForToday() {
	const { state } = useToday();
	useLaunchHold(useTodayHolds(state.ready), "today");
	return null;
}
