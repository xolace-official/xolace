import { AnimatedLegendList } from "@legendapp/list/reanimated";
import type { ReactElement } from "react";
import { View } from "react-native";
import { LinearTransition, ReduceMotion } from "react-native-reanimated";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
import { useTokenColor } from "@/lib/use-token-color";
import { ChannelRow, ChatRowBody } from "./chat-row";
import type { ChatRowView } from "./chats-model";
import type { RowActions } from "./row-actions";
import { RowPress } from "./row-press";
import { SwipeArchive } from "./swipe-archive";

const REFLOW_MS = 240;
const ROW_ESTIMATE = 74;

export function ChatsList({
	rows,
	actions,
	header,
	footer,
	bottom,
}: {
	rows: readonly ChatRowView[];
	actions: RowActions;
	header: ReactElement;
	footer?: ReactElement | null;
	bottom: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const background = useTokenColor("background");
	const playerInset = useMiniPlayerInset();
	return (
		<AnimatedLegendList
			contentContainerStyle={{ paddingBottom: bottom + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
			data={rows}
			estimatedItemSize={ROW_ESTIMATE}
			getItemType={(row) => row.kind}
			itemLayoutAnimation={
				reduced
					? undefined
					: LinearTransition.duration(REFLOW_MS).reduceMotion(
							ReduceMotion.Never
						)
			}
			keyExtractor={(row) => row.id}
			ListFooterComponent={footer ?? null}
			ListHeaderComponent={header}
			renderItem={({ item }) => <ChatItem actions={actions} row={item} />}
			style={{ backgroundColor: background }}
		/>
	);
}

function ChatItem({ row, actions }: { row: ChatRowView; actions: RowActions }) {
	return (
		<View className="px-4">
			{row.kind === "broadcast" ? (
				<ChannelRow onPress={() => actions.open(row)} row={row} />
			) : (
				<SwipeArchive actions={actions} row={row}>
					<RowPress actions={actions} row={row}>
						<ChatRowBody row={row} />
					</RowPress>
				</SwipeArchive>
			)}
		</View>
	);
}
