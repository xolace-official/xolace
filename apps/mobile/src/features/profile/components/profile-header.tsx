import { View } from "react-native";
import {
	useCollapseProgress,
	useHeaderScrollY,
} from "react-native-collapsible-tab";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { AuroraArc } from "@/components/shared/aurora-arc";
import { ProfileHero } from "@/features/profile/components/profile-hero";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { StatBand } from "@/features/profile/components/stat-band";
import type { ProfileSummary } from "@/features/profile/hooks/use-profile-summary";

// Collapse px over which the top bar goes from clear to solid.
const BAR_FADE_RANGE = [8, 40];
// The name shows once the hero is nearly gone.
const TITLE_FADE_RANGE = [0.75, 1];

type Props = {
	summary: ProfileSummary | undefined;
	/** Native header height: the band the collapsed header leaves visible. */
	topBarHeight: number;
	usualDay: string | null;
	avatar: { key: string | null; label?: string; url: string | null };
	onAvatarPress?: () => void;
};

/** The collapsing part of the profile: aurora, hero and stats, plus the top bar
 * that turns solid as they scroll away. */
export function ProfileHeader({
	summary,
	topBarHeight,
	usualDay,
	avatar,
	onAvatarPress,
}: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={{ paddingBottom: 20, paddingTop: insets.top + 36 }}>
			<AuroraArc height={insets.top + 280} />

			{summary ? (
				<ProfileHero
					avatarKey={avatar.key}
					avatarLabel={avatar.label}
					avatarUrl={avatar.url}
					displayName={summary.displayName}
					firstSessionAt={summary.firstSessionAt}
					onAvatarPress={onAvatarPress}
					sessionCount={summary.sessionCount}
				/>
			) : (
				<ProfileSkeleton />
			)}

			{summary && summary.sessionCount > 0 && (
				<StatBand
					currentStreak={summary.currentStreak}
					longestStreak={summary.longestStreak}
					sessionCount={summary.sessionCount}
					staggerDelay={120}
					usualDay={usualDay}
				/>
			)}

			<TopBar height={topBarHeight} title={summary?.displayName} />
		</View>
	);
}

/** Pinned under the native header's buttons. It lives inside the header (the
 * library's hooks only work there) and rides back down by the collapsed
 * distance, so it holds still on screen while the header moves. */
function TopBar({ height, title }: { height: number; title?: string }) {
	const insets = useSafeAreaInsets();
	const scrollY = useHeaderScrollY();
	const progress = useCollapseProgress();

	const barStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			scrollY.get(),
			BAR_FADE_RANGE,
			[0, 1],
			Extrapolation.CLAMP
		),
		transform: [{ translateY: scrollY.get() }],
	}));
	const titleStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			progress.get(),
			TITLE_FADE_RANGE,
			[0, 1],
			Extrapolation.CLAMP
		),
	}));

	return (
		<Animated.View
			className="absolute inset-x-0 top-0 bg-background"
			pointerEvents="none"
			style={[{ height }, barStyle]}
		>
			{title ? (
				<Animated.View
					className="flex-1 items-center justify-center"
					style={[{ paddingTop: insets.top }, titleStyle]}
				>
					<AppText
						className="font-semibold text-[15px] text-foreground"
						importantForAccessibility="no"
						numberOfLines={1}
					>
						{title}
					</AppText>
				</Animated.View>
			) : null}
		</Animated.View>
	);
}
