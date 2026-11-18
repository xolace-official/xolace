import { View } from "react-native";
import { COPY } from "../copy";
import { quietTile } from "../rail/rail-model";
import { useToday } from "../today-data";
import { TodaySection } from "../today-section";
import { LateCare } from "./late-care";
import { LateQuiet } from "./late-quiet";

/** The quiet row's height (52 pt art and 12 pt padding), held while the shelf loads. */
const QUIET_H = 76;

/**
 * After 10pm the page thins to two things, 36 below the hero: something for the quiet
 * (the rail's music, else its first track) and care. While the shelf loads the quiet row
 * keeps its place, so care never moves down under someone reaching for it.
 */
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
