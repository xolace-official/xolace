import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { XolaceMark } from "../../parts/xolacer-avatar";
import { CHANNEL } from "../copy";

const MARK = 38;

/** The header's title slot: the flame, "Xolace", "Camp announcements", as on the Chats row. */
export function ChannelTitle() {
	return (
		<View
			accessibilityLabel={`${CHANNEL.title}. ${CHANNEL.sub}`}
			accessibilityRole="header"
			accessible
			className="flex-row items-center gap-2.5"
		>
			<XolaceMark size={MARK} />
			<View className="min-w-0 shrink">
				<AppText
					className="text-[17px]"
					numberOfLines={1}
					variant="subhead"
					weight="semibold"
				>
					{CHANNEL.title}
				</AppText>
				<AppText
					className="text-[12.5px]"
					color="muted"
					numberOfLines={1}
					variant="caption"
				>
					{CHANNEL.sub}
				</AppText>
			</View>
		</View>
	);
}
