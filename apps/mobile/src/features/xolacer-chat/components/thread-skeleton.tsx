import { Skeleton } from "heroui-native";
import { View } from "react-native";

/** Stands in for the message list; bottom-anchored and bubble-shaped so real messages land
 * without a reflow. */
export function ThreadSkeleton() {
	return (
		<View className="flex-1 justify-end gap-3 bg-background px-4 pb-10">
			<Skeleton className="h-12 w-2/3 rounded-2xl" />
			<Skeleton className="h-12 w-1/2 self-end rounded-2xl" />
			<Skeleton className="h-12 w-3/5 rounded-2xl" />
		</View>
	);
}
