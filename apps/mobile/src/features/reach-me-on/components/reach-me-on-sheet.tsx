import { useEffect } from "react";
import {
	AccessibilityInfo,
	ActivityIndicator,
	Platform,
	ScrollView,
	View,
} from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { ChannelCard } from "@/features/reach-me-on/components/channel-card";
import { TelegramCard } from "@/features/reach-me-on/components/telegram-card";
import { useReachSheet } from "@/features/reach-me-on/reach-sheet-data";
import {
	orderMark,
	unreachableNotice,
} from "@/features/reach-me-on/reach-view";
import { useTokenColor } from "@/lib/use-token-color";

export const ReachMeOnSheet = () => {
	const subtle = useTokenColor("subtle");
	const {
		state: { channels, reach },
		actions: { tryFirst },
	} = useReachSheet();
	const notice = reach === "reachable" ? null : unreachableNotice(reach);
	const line = notice?.line;
	// The banner is read out when it appears: a live region on Android, an announcement on iOS.
	useEffect(() => {
		if (line && Platform.OS === "ios") {
			AccessibilityInfo.announceForAccessibility(line);
		}
	}, [line]);

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
			{notice ? (
				<View
					accessibilityLiveRegion="polite"
					className="mx-4 flex-row items-center gap-2 rounded-[16px] border-continuous bg-surface-secondary px-3.5 py-2.5"
				>
					<Icon color={subtle} name={notice.icon} size={14} />
					<AppText
						className="flex-1 text-[13.5px] text-foreground/60 leading-[18px]"
						variant="body"
					>
						{notice.line}
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
							disabled={notice !== null}
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
