import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CHANNEL } from "../copy";

/** Stream's empty list, in the channel's words. */
export function EmptyChannel() {
	return (
		<View className="flex-1 items-center justify-center px-10">
			<AppText center color="muted" variant="callout">
				{CHANNEL.empty}
			</AppText>
		</View>
	);
}
