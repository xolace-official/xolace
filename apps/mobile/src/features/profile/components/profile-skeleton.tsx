import { View } from "react-native";
import { SkeletonGroup } from "heroui-native";

/**
 * Mirrors ProfileHero + StatBand + chart layout proportions so the
 * loading -> loaded transition doesn't cause a layout jump.
 */
export function ProfileSkeleton() {
  return (
    <SkeletonGroup className="px-6">
      <View className="items-center">
        <SkeletonGroup.Item className="w-20 h-20 rounded-full" />
        <SkeletonGroup.Item className="h-6 w-44 rounded-md mt-4" />
        <SkeletonGroup.Item className="h-4 w-36 rounded-md mt-2" />
      </View>

      <View className="flex-row rounded-3xl bg-surface border border-border/60 py-5 px-3 mt-7 -mx-1">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`flex-1 items-center px-1.5 ${i > 0 ? "border-l border-separator/50" : ""}`}
          >
            <SkeletonGroup.Item className="h-5 w-8 rounded-md" />
            <SkeletonGroup.Item className="h-2.5 w-12 rounded-md mt-2" />
          </View>
        ))}
      </View>

      <SkeletonGroup.Item className="h-56 w-full rounded-2xl mt-10" />
    </SkeletonGroup>
  );
}
