import { ActivityIndicator, ScrollView, View } from "react-native";
import { Footnote, SectionTitle } from "@/components/settings-kit/parts";
import { AppText } from "@/components/shared/app-text";
import { ChannelCard } from "@/features/reach-me-on/components/channel-card";
import { TelegramCard } from "@/features/reach-me-on/components/telegram-card";
import { useReachSheet } from "@/features/reach-me-on/reach-sheet-data";
import { orderMark } from "@/features/reach-me-on/reach-view";

/**
 * "Reach me on…": one grouped card per channel, the First one tried first (#733, #776),
 * drawn on the settings kit like Notifications' Reach me on section (S19c). Reads its
 * `ReachSheetProvider`: Convex in the app, fixtures in a dev state.
 */
export const ReachMeOnSheet = () => {
	const {
		state: { channels, offline },
		actions: { tryFirst },
	} = useReachSheet();

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="pt-1 pb-16"
			contentInsetAdjustmentBehavior="automatic"
		>
			<Footnote className="pt-3 pb-4">
				Where Xolace checks in on you. We use the one marked First, and the
				other if it can&apos;t get through.
			</Footnote>
			{offline ? (
				<Footnote className="pt-0 pb-4">
					You&apos;re offline. Changes wait until the connection is back.
				</Footnote>
			) : null}
			<SectionTitle>Channels</SectionTitle>
			{channels === undefined ? (
				<View className="items-center py-12">
					<ActivityIndicator accessibilityLabel="Loading channels" />
				</View>
			) : (
				<View className="gap-4">
					{channels.map((entry) =>
						entry.channel === "telegram" ? (
							<TelegramCard entry={entry} key={entry.channel} />
						) : (
							<ChannelCard
								channel={entry.channel}
								disabled={offline}
								key={entry.channel}
								mark={orderMark(entry)}
								onTryFirst={() => tryFirst(entry.channel)}
								statusLine="On this phone"
							>
								<AppText
									className="text-[15px] text-foreground/70 leading-[21px]"
									variant="body"
								>
									Always used for chat messages from people.
								</AppText>
							</ChannelCard>
						)
					)}
				</View>
			)}
			<Footnote className="pt-4">
				Check-ins follow the same quiet hours wherever they go.
			</Footnote>
		</ScrollView>
	);
};
