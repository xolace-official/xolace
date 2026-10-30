import Settings from "@expo/material-symbols/settings.xml";
import { Stack, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "react-native-collapsible-tab";
import { AvatarPickerSheet } from "@/features/profile/components/avatar-picker-sheet";
import { FollowUpsTab } from "@/features/profile/components/follow-ups-tab";
import { InsightsTab } from "@/features/profile/components/insights-tab";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { ProfileTabBar } from "@/features/profile/components/profile-tab-bar";
import {
	resolveAvatar,
	useAvatars,
} from "@/features/profile/hooks/use-avatars";
import { useFollowUpsWaitingCount } from "@/features/profile/hooks/use-profile-follow-ups";
import { useProfileSummary } from "@/features/profile/hooks/use-profile-summary";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INSIGHTS = "insights";
const FOLLOW_UPS = "follow-ups";

export function ProfileScreen() {
	const router = useRouter();
	const headerHeight = useHeaderHeight();
	const background = useThemeColor("background") as string;
	const summary = useProfileSummary();
	const avatars = useAvatars();
	const [pickerOpen, setPickerOpen] = useState(false);
	const waitingCount = useFollowUpsWaitingCount();

	const currentAvatar = resolveAvatar(avatars, summary?.avatarId);
	const usualDay =
		(summary?.sessionCount ?? 0) >= 5 && summary?.typicalUsagePattern
			? SHORT_DAYS[summary.typicalUsagePattern.dayOfWeek]
			: null;

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen
				options={{
					animation: "slide_from_bottom",
					headerBackButtonDisplayMode: "minimal",
					headerBackVisible: true,
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "",
					headerTransparent: true,
				}}
			/>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon={process.env.EXPO_OS === "ios" ? "gearshape" : Settings}
					onPress={() => router.push("/settings")}
				/>
			</Stack.Toolbar>

			<Tabs.Container
				headerBackgroundColor={background}
				// Both tabs mount up front: a list that mounts empty on first swipe
				// can't take the docked offset, so the header would spring open.
				minHeaderHeight={headerHeight}
				renderHeader={() => (
					<ProfileHeader
						avatar={{
							key: currentAvatar?.key ?? null,
							label: currentAvatar?.label,
							url: currentAvatar?.url ?? null,
						}}
						onAvatarPress={
							avatars && avatars.length > 0
								? () => setPickerOpen(true)
								: undefined
						}
						summary={summary}
						topBarHeight={headerHeight}
						usualDay={usualDay}
					/>
				)}
				renderTabBar={(props) => (
					<ProfileTabBar {...props} badges={{ [FOLLOW_UPS]: waitingCount }} />
				)}
			>
				<Tabs.Tab label="Insights" name={INSIGHTS}>
					<InsightsTab summary={summary} />
				</Tabs.Tab>
				<Tabs.Tab label="Follow-ups" name={FOLLOW_UPS}>
					<FollowUpsTab />
				</Tabs.Tab>
			</Tabs.Container>

			<AvatarPickerSheet
				avatars={avatars}
				currentKey={summary?.avatarId ?? null}
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
			/>
		</View>
	);
}
