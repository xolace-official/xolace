import { View } from "react-native";
import { COPY } from "../copy";
import { quietTile } from "../rail/rail-model";
import { useToday } from "../today-data";
import { TodaySection } from "../today-section";
import { LateCare } from "./late-care";
import { LateQuiet } from "./late-quiet";

/**
 * After 10pm the page thins to two things, 36 below the hero: something for the quiet
 * (the rail's music, when it has some) and care.
 */
export function LateModules() {
	const { state } = useToday();
	const quiet = quietTile(state.rail ?? []);
	return (
		<View className="mx-4 mt-9">
			{quiet ? (
				<>
					<TodaySection title={COPY.listen.lateTitle} />
					<LateQuiet tile={quiet} />
				</>
			) : null}
			<LateCare />
		</View>
	);
}
