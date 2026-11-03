// The badge detail page (#692), Reddit's arrangement from #684: title and
// copy up top, the badge large in the open middle, the date or progress under
// it. Pin comes with #699; the empty foot is where Share will go.

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge";
import { ProgressBar, progressLabel } from "./progress-bar";
import type { AchievementView } from "./types";

const SIDE_GUTTER = 48;
const MAX_BADGE = 340;
/** Header height under the status bar; the header itself is transparent. */
const HEADER_CLEARANCE = 72;
/** Room under the content for the home indicator plus a margin. */
const FOOT_CLEARANCE = 32;

const formatDate = (at: number) =>
	new Date(at).toLocaleDateString(undefined, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

export function BadgeDetailScreen({
	achievementId,
}: {
	achievementId: string;
}) {
	const insets = useSafeAreaInsets();
	const achievement = useQuery(api.achievements.display.get, { achievementId });

	return (
		<View
			className="flex-1 bg-background px-8"
			style={{
				paddingBottom: insets.bottom + FOOT_CLEARANCE,
				paddingTop: insets.top + HEADER_CLEARANCE,
			}}
		>
			<Stack.Screen
				options={{
					headerBackButtonDisplayMode: "minimal",
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "",
					headerTransparent: true,
				}}
			/>
			<DetailBody achievement={achievement} />
		</View>
	);
}

function DetailBody({
	achievement,
}: {
	achievement: AchievementView | null | undefined;
}) {
	if (achievement === undefined) {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator accessibilityLabel="Loading badge" />
			</View>
		);
	}
	if (achievement === null) {
		return (
			<View className="flex-1 items-center justify-center">
				<AppText className="text-center text-[16px] text-muted">
					This badge isn't here anymore.
				</AppText>
			</View>
		);
	}
	return <Detail achievement={achievement} />;
}

function Detail({ achievement }: { achievement: AchievementView }) {
	const { width } = useWindowDimensions();
	const size = Math.min(width - SIDE_GUTTER * 2, MAX_BADGE);
	const { copy, earnedAt, progress, sparks, title } = achievement;
	return (
		<>
			<View className="items-center">
				<AppText
					accessibilityRole="header"
					className="text-center font-serif text-[30px] text-foreground leading-9"
				>
					{title}
				</AppText>
				<AppText className="mt-3 text-center text-[16px] text-foreground/65 leading-6">
					{copy}
				</AppText>
			</View>
			<View className="flex-1 items-center justify-center">
				<Badge achievement={achievement} size={size} />
				<View className="mt-10 items-center">
					{earnedAt === undefined ? null : (
						<AppText className="text-[15px] text-muted">
							Unlocked on {formatDate(earnedAt)}
						</AppText>
					)}
					{progress ? (
						<>
							<ProgressBar className="h-1.5 w-56" progress={progress} />
							<AppText className="mt-3 text-[15px] text-muted">
								{progressLabel(progress)}
							</AppText>
						</>
					) : null}
					<AppText className="mt-2 font-semibold text-[14px] text-ember">
						{earnedAt === undefined ? `${sparks} sparks` : `+${sparks} sparks`}
					</AppText>
				</View>
			</View>
			<View className="h-16" />
		</>
	);
}
