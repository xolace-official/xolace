import { View } from "react-native";
import { COPY } from "../copy";
import { quietTile } from "../rail/rail-model";
import { useToday } from "../today-data";
import { TodaySection } from "../today-section";
import { LateCare } from "./late-care";
import { LateQuiet } from "./late-quiet";

const QUIET_H = 76;

export function LateModules() {
	const { state } = useToday();
	const loading = state.rail === undefined;
	const quiet = quietTile(state.rail ?? []);
	return (
		<View className="mx-4 mt-9">
			{loading || quiet ? (
				<>
					<TodaySection title={COPY.listen.lateTitle} />
					{quiet ? (
						<LateQuiet tile={quiet} />
					) : (
						<View className="mt-3.5" style={{ height: QUIET_H }} />
					)}
				</>
			) : null}
			<LateCare />
		</View>
	);
}
