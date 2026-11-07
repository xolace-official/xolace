import { SkeletonGroup } from "heroui-native";
import { View } from "react-native";

/** Mirrors the ProfileHero + StatBand (with its FreezeRow) + chart proportions to avoid a layout jump. */
export function ProfileSkeleton() {
	return (
		<SkeletonGroup className="px-6">
			<View className="items-center">
				<SkeletonGroup.Item className="h-20 w-20 rounded-full" />
				<SkeletonGroup.Item className="mt-4 h-6 w-44 rounded-md" />
				<SkeletonGroup.Item className="mt-2 h-4 w-36 rounded-md" />
			</View>

			<View className="-mx-1 mt-7 rounded-3xl border border-border/60 bg-surface px-3 py-5">
				<View className="flex-row">
					{[0, 1, 2].map((i) => (
						<View
							className={`flex-1 items-center px-1.5 ${i > 0 ? "border-separator/50 border-l" : ""}`}
							key={i}
						>
							<SkeletonGroup.Item className="h-5 w-8 rounded-md" />
							<SkeletonGroup.Item className="mt-2 h-2.5 w-12 rounded-md" />
						</View>
					))}
				</View>

				{/* FreezeRow: 36px crystal, count, label + hint. */}
				<View className="mt-4 flex-row items-center gap-3 border-separator/50 border-t px-2 pt-4">
					<SkeletonGroup.Item className="h-9 w-9 rounded-full" />
					<SkeletonGroup.Item className="h-5 w-7 rounded-md" />
					<View className="flex-1">
						<SkeletonGroup.Item className="h-3.5 w-32 rounded-md" />
						<SkeletonGroup.Item className="mt-1.5 h-3 w-44 rounded-md" />
					</View>
				</View>
			</View>

			<SkeletonGroup.Item className="mt-10 h-56 w-full rounded-2xl" />
		</SkeletonGroup>
	);
}
