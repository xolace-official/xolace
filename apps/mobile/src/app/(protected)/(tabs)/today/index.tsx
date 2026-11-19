import { View } from "react-native";
import { ComingBackHost } from "@/features/coming-back/coming-back-host";
import { ReturnPill } from "@/features/coming-back/pill/return-pill";
import { ReturnPillData } from "@/features/coming-back/return-pill-data";
import { FindingCard } from "@/features/intake/finding-card";
import {
	useLaunchHold,
	useLaunchRevealed,
} from "@/features/launch/launch-store";
import { TodayData, useToday } from "@/features/today/today-data";
import { TodayScreen } from "@/features/today/today-screen";
import { useTodayHolds } from "@/features/today/use-today-hold";

/**
 * The Today tab, the app's landing: Today on its data, with the intake's day-3 question and
 * coming back's pill composed in, and coming back over it (the greeting once per return, the
 * in-app banner). At launch the cover waits for what Today draws above the fold.
 */
export default function TodayRoute() {
	const revealed = useLaunchRevealed();
	return (
		<View className="flex-1">
			<TodayData>
				<HoldForToday />
				<TodayScreen
					finding={<FindingCard />}
					pill={(fallback) => (
						<ReturnPillData>
							<ReturnPill fallback={fallback} />
						</ReturnPillData>
					)}
					revealed={revealed}
				/>
			</TodayData>
			<ComingBackHost />
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
