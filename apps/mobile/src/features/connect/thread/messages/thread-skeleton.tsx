import { View } from "react-native";

/** Stands in for the message list: bottom-anchored and bubble-shaped (22 pt, the bubbles'
 * radius) so real messages land without a reflow. */
export function ThreadSkeleton() {
	return (
		<View
			accessibilityElementsHidden
			className="flex-1 justify-end gap-2 bg-background px-3.5 pb-10"
			importantForAccessibility="no-hide-descendants"
		>
			<View className="h-12 w-2/3 self-end rounded-[22px] bg-surface-secondary" />
			<View className="h-16 w-3/5 rounded-[22px] bg-surface-secondary" />
			<View className="h-12 w-1/2 self-end rounded-[22px] bg-surface-secondary" />
		</View>
	);
}
