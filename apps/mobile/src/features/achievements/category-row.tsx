import { Link } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { Badge } from "./badge";
import { PinMark } from "./pin-mark";
import { ProgressBar, progressLabel } from "./progress-bar";
import type { AchievementsOverview, AchievementView } from "./types";

const MEDALLION_SIZE = 84;

type Props = { category: AchievementsOverview["categories"][number] };

/**
 * One category (#684): "N of M unlocked", then medallions scrolling sideways in
 * the server's order (earned, the next rung with its bar, then locked).
 */
export function CategoryRow({ category }: Props) {
	const { achievements, title } = category;
	const unlocked = achievements.filter((a) => a.earnedAt !== undefined).length;
	return (
		<View className="mt-7">
			<View className="flex-row items-baseline justify-between px-5">
				<AppText
					accessibilityRole="header"
					className="font-semibold text-[17px] text-foreground"
				>
					{title}
				</AppText>
				<AppText className="text-[13px] text-muted">
					{unlocked} of {achievements.length} unlocked
				</AppText>
			</View>
			<ScrollView
				contentContainerClassName="gap-3 px-5 pt-3"
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{achievements.map((achievement) => (
					<Medallion
						achievement={achievement}
						key={achievement.achievementId}
					/>
				))}
			</ScrollView>
		</View>
	);
}

function Medallion({ achievement }: { achievement: AchievementView }) {
	const { earnedAt, pinned, progress, title } = achievement;
	const earned = earnedAt !== undefined;
	// One label for the whole tile, so VoiceOver doesn't read the title twice.
	const label = [
		earned ? title : `${title}, locked`,
		pinned && "pinned",
		progress && progressLabel(progress),
	]
		.filter(Boolean)
		.join(", ");
	return (
		<Link
			asChild
			href={{
				params: { achievementId: achievement.achievementId },
				pathname: "/achievements/[achievementId]",
			}}
		>
			<Pressable
				accessibilityHint="Opens the badge"
				accessibilityLabel={label}
				accessibilityRole="button"
				className="w-[92px] items-center"
			>
				<View className="relative">
					<Badge achievement={achievement} size={MEDALLION_SIZE} />
					{pinned ? <PinMark /> : null}
				</View>
				<AppText
					className={cn(
						"mt-1.5 text-center text-[11.5px] leading-4",
						earned ? "text-foreground" : "text-muted"
					)}
					numberOfLines={2}
				>
					{title}
				</AppText>
				{progress ? (
					<ProgressBar className="mt-1.5 h-1 w-16" progress={progress} />
				) : null}
			</Pressable>
		</Link>
	);
}
