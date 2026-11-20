import Settings from "@expo/material-symbols/settings.xml";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { View } from "react-native";
import { Tabs } from "react-native-collapsible-tab";
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

export function YouScreen() {
	const header = useHeaderOptions("small");
	const headerHeight = useHeaderHeight();
	const { state, actions } = useYouHome();
	const { startTab, tabs } = useYouUi();

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
					initialTabName={startTab}
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
