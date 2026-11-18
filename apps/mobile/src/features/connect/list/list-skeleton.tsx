import { View } from "react-native";

const SKELETON_ROWS = 3;

/** Row-shaped, not card-shaped: the list it resolves into is flat. */
export function ListSkeleton() {
	return (
		<View
			accessibilityElementsHidden
			className="gap-3 px-4 pt-1"
			importantForAccessibility="no-hide-descendants"
		>
			{Array.from({ length: SKELETON_ROWS }, (_, i) => (
				<View className="flex-row items-center gap-3 px-1 py-3" key={i}>
					<View className="size-12 rounded-full bg-surface-secondary" />
					<View className="flex-1 gap-2">
						<View className="h-3.5 w-28 rounded-full bg-surface-secondary" />
						<View className="h-3 w-48 rounded-full bg-surface-secondary" />
					</View>
				</View>
			))}
		</View>
	);
}
