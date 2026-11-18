import { View } from "react-native";
import { LateCare } from "./late-care";

/**
 * After 10pm the page thins to two things, 36 below the hero: something for the
 * quiet (its title and sound row land with the rail's data, S1d), and care.
 */
export function LateModules() {
	return (
		<View className="mx-4 mt-9">
			<LateCare />
		</View>
	);
}
