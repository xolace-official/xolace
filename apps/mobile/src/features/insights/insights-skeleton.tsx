import { SkeletonGroup } from "heroui-native";
import { View } from "react-native";

/** Mirrors OverallDial + PartsOfLife (grid) proportions so the loading -> loaded swap doesn't
 * jump. */
export function InsightsSkeleton() {
	return (
		<SkeletonGroup className="gap-8 px-5">
			<View className="items-center gap-3 rounded-3xl border border-border/60 bg-surface py-6">
				<SkeletonGroup.Item className="size-[236px] rounded-full" />
				<SkeletonGroup.Item className="h-7 w-24 rounded-full" />
				<SkeletonGroup.Item className="mt-2 h-4 w-3/4 rounded-md" />
			</View>

			<View className="gap-3">
				<View className="flex-row items-center justify-between">
					<SkeletonGroup.Item className="h-6 w-44 rounded-md" />
					<SkeletonGroup.Item className="h-8 w-20 rounded-full" />
				</View>
				<View className="flex-row flex-wrap justify-between gap-y-5 rounded-3xl border border-border/60 bg-surface p-4">
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<View className="w-[31%] items-center gap-2" key={i}>
							<SkeletonGroup.Item className="size-[86px] rounded-full" />
							<SkeletonGroup.Item className="h-3 w-14 rounded-md" />
						</View>
					))}
				</View>
			</View>
		</SkeletonGroup>
	);
}
