import { View } from "react-native";
import { ComingBackHost } from "@/features/coming-back/coming-back-host";
import { ReturnPill } from "@/features/coming-back/pill/return-pill";
import { ReturnPillData } from "@/features/coming-back/return-pill-data";
import {
	useLaunchHold,
	useLaunchRevealed,
} from "@/features/launch/launch-store";
import { TodayData, useToday } from "@/features/today/today-data";
import { TodayScreen } from "@/features/today/today-screen";
import { useTodayHolds } from "@/features/today/use-today-hold";

export default function TodayRoute() {
	const revealed = useLaunchRevealed();
	return (
		<View className="flex-1">
			<TodayData>
				<HoldForToday />
				<TodayScreen
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

function HoldForToday() {
	const { state } = useToday();
	useLaunchHold(useTodayHolds(state.ready), "today");
	return null;
}
