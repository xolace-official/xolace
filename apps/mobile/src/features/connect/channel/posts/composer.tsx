import { View } from "react-native";
import { MessageComposer } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { CHANNEL } from "../copy";
import { useCanPost } from "./use-can-post";

const LOCK = { android: "lock", ios: "lock.fill" } as const;
const LOCK_RADIUS = 28;

export function ChannelComposer() {
	const muted = useTokenColor("muted");
	if (useCanPost()) {
		return <MessageComposer />;
	}
	return (
		<View className="px-3 pt-1.5 pb-safe-or-3">
			<Card
				className="flex-row items-center gap-2.5 px-4 py-3"
				flat
				radius={LOCK_RADIUS}
			>
				<Icon color={muted} name={LOCK} size={14} />
				<AppText
					className="flex-1 leading-[18px]"
					color="muted"
					variant="footnote"
				>
					{CHANNEL.lock}
				</AppText>
			</Card>
		</View>
	);
}
