import { ActivityIndicator, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ChannelCard } from "@/features/reach-me-on/components/channel-card";
import { TelegramCard } from "@/features/reach-me-on/components/telegram-card";
import { useReachSheet } from "@/features/reach-me-on/reach-sheet-data";
import { orderMark } from "@/features/reach-me-on/reach-view";

/** "Reach me on…": one card per channel, the First one tried first (#733, #776).
 * Reads its `ReachSheetProvider`: Convex in the app, fixtures in a dev state. */
export const ReachMeOnSheet = () => {
	const {
		state: { channels, offline },
		actions: { tryFirst },
	} = useReachSheet();

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="gap-4 px-5 pt-4 pb-16"
			contentInsetAdjustmentBehavior="automatic"
		>
			<AppText className="text-base text-foreground/65">
				Where Xolace checks in on you. We use the one marked First, and the
				other if it can&apos;t get through.
			</AppText>
			{offline && (
				<AppText className="text-foreground/55 text-sm">
					You&apos;re offline. Changes wait until the connection is back.
				</AppText>
			)}
			{channels === undefined ? (
				<View className="items-center py-12">
					<ActivityIndicator accessibilityLabel="Loading channels" />
				</View>
			) : (
				channels.map((entry) =>
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
							<AppText className="text-foreground/60 text-sm">
								Always used for chat messages from people.
							</AppText>
						</ChannelCard>
					)
				)
			)}
		</ScrollView>
	);
};
