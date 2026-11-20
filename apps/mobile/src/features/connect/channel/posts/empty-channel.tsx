import { View } from "react-native";
import { EmptyState } from "@/components/shared/empty-state";
import { CHANNEL } from "../copy";

/** Stream's empty list, in the channel's words: the shared empty state, the face waiting. */
export function EmptyChannel() {
	return (
		<View className="flex-1 justify-center">
			<EmptyState body={CHANNEL.empty.body} face title={CHANNEL.empty.title} />
		</View>
	);
}
