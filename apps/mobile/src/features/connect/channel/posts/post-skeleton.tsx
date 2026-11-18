import { View } from "react-native";

const CARDS = 2;

/** Card-shaped, not bubble-shaped: the list it resolves into is cards. */
export function PostSkeleton() {
	return (
		<View
			accessibilityElementsHidden
			className="flex-1 justify-end gap-3 px-3.5 pb-24"
			importantForAccessibility="no-hide-descendants"
		>
			{Array.from({ length: CARDS }, (_, i) => (
				<View
					className="gap-2.5 rounded-[24px] border-continuous bg-surface p-4"
					key={i}
				>
					<View className="h-4 w-44 rounded-full bg-surface-secondary" />
					<View className="h-3 w-full rounded-full bg-surface-secondary" />
					<View className="h-3 w-3/5 rounded-full bg-surface-secondary" />
					<View className="mt-1 h-8 w-20 rounded-full bg-surface-secondary" />
				</View>
			))}
		</View>
	);
}
