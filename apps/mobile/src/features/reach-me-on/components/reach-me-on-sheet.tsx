import { ActivityIndicator, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { ChannelCard } from "@/features/reach-me-on/components/channel-card";
import { TelegramCard } from "@/features/reach-me-on/components/telegram-card";
import { useReachSheet } from "@/features/reach-me-on/reach-sheet-data";
import { orderMark } from "@/features/reach-me-on/reach-view";
import { useTokenColor } from "@/lib/use-token-color";

const OFFLINE = { android: "wifi_off", ios: "wifi.slash" } as const;

/**
 * "Reach me on…" (#733, #776) in the redesign's look (P/src/features/reach/reach-screen.tsx): the
 * intro, an offline banner when there's no connection, then one card per channel, Telegram first;
 * the one marked First is tried first. Reads its `ReachSheetProvider`: Convex in the app, fixtures
 * in a dev state.
 */
export const ReachMeOnSheet = () => {
	const subtle = useTokenColor("subtle");
	const {
		state: { channels, offline },
		actions: { tryFirst },
	} = useReachSheet();

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="gap-3 pt-2 pb-12"
			contentInsetAdjustmentBehavior="automatic"
		>
			<AppText
				className="px-5 pb-1 text-[15px] text-foreground/65 leading-[21px]"
				variant="body"
			>
				Where Xolace checks in on you. We use the one marked First, and the
				other if it can&apos;t get through.
			</AppText>
			{offline ? (
				<View className="mx-4 flex-row items-center gap-2 rounded-[16px] border-continuous bg-surface-secondary px-3.5 py-2.5">
					<Icon color={subtle} name={OFFLINE} size={14} />
					<AppText
						className="flex-1 text-[13.5px] text-foreground/60 leading-[18px]"
						variant="body"
					>
						You&apos;re offline. Changes wait until the connection is back.
					</AppText>
				</View>
			) : null}
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
							<AppText
								className="text-[14.5px] text-foreground/60 leading-5"
								variant="body"
							>
								Always used for chat messages from people.
							</AppText>
						</ChannelCard>
					)
				)
			)}
		</ScrollView>
	);
};
