import { View } from "react-native";
import { EmptyState } from "@/components/shared/empty-state";
import { CHANNEL } from "../copy";

export function EmptyChannel() {
	return (
		<View className="flex-1 justify-center">
			<EmptyState body={CHANNEL.empty.body} face title={CHANNEL.empty.title} />
		</View>
	);
}
