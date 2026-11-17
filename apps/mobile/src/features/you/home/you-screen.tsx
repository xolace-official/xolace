import Settings from "@expo/material-symbols/settings.xml";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { type CollapsingTabsRef, Tabs } from "react-native-collapsible-tab";
import { COPY } from "@/features/you/copy";
import { FollowUpsTab } from "@/features/you/home/follow-ups/follow-ups-tab";
import { YouHeader } from "@/features/you/home/header/you-header";
import { InsightsTab } from "@/features/you/home/insights/insights-tab";
import { FreezeTip } from "@/features/you/home/streak/freeze-tip";
import { YouTabBar } from "@/features/you/home/tabs/you-tab-bar";
import { useYouHome } from "@/features/you/home/you-data";
import { useYouUi, type YouTab } from "@/features/you/home/you-ui";
import { useHeaderOptions } from "@/lib/header-options";

const INSIGHTS: YouTab = "insights";
const FOLLOW_UPS: YouTab = "follow-ups";

/**
 * The You tab (P/design/handoff/you.md): production's profile screen kept in its structure.
 * A see-through native header with the gear, a collapsing header, and the Insights /
 * Follow-ups tabs that dock under the bar. Both tabs mount up front: a list that mounts empty
 * on first swipe can't take the docked offset, so the header would spring open.
 */
export function YouScreen() {
	const header = useHeaderOptions("small");
	const headerHeight = useHeaderHeight();
	const tabs = useRef<CollapsingTabsRef>(null);
	const { state, actions } = useYouHome();
	const { tab } = useYouUi();

	// The week's tap (or a dev state) picks a tab.
	useEffect(() => {
		if (tab) {
			tabs.current?.jumpToTab(tab.name, false);
		}
	}, [tab]);

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen
				options={{
					...header,
					headerBackVisible: false,
					headerShown: true,
					headerTitle: "",
				}}
			/>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					accessibilityLabel={COPY.screen.settings}
					icon={process.env.EXPO_OS === "ios" ? "gearshape" : Settings}
					onPress={actions.openSettings}
				/>
			</Stack.Toolbar>

			{headerHeight > 0 ? (
				<Tabs.Container
					headerBackgroundColor="transparent"
					initialTabName={tab?.name}
					minHeaderHeight={headerHeight}
					ref={tabs}
					renderHeader={() => <YouHeader topBarHeight={headerHeight} />}
					renderTabBar={(props) => (
						<YouTabBar
							{...props}
							badges={{ [FOLLOW_UPS]: state.followUps.waiting }}
						/>
					)}
				>
					<Tabs.Tab label={COPY.screen.tabs.insights} name={INSIGHTS}>
						<InsightsTab minHeader={headerHeight} />
					</Tabs.Tab>
					<Tabs.Tab label={COPY.screen.tabs.followUps} name={FOLLOW_UPS}>
						<FollowUpsTab />
					</Tabs.Tab>
				</Tabs.Container>
			) : null}

			<FreezeTip />
		</View>
	);
}
