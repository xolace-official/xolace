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

/** Archiving or restoring a chat slides the rows below it into place over 240 ms. */
const REFLOW_MS = 240;
/** A two-line row: avatar 48 plus its padding and hairline. */
const ROW_ESTIMATE = 74;

/**
 * The chats, virtualized (`myConversations` returns up to 200): the page's one scroll view, so
 * the large title folds over it. The screen's own pieces ride along as header and footer.
 * Not recycled: a row holds its swipe and measured width, which mustn't pass to another chat.
 * A tap opens, a hold opens the menu, a trailing swipe archives.
 */
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
	/** Room under the last row, above the tab bar or the home indicator. */
	bottom: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const background = useTokenColor("background");
	// Clears the floating mini player off the last row (none on iOS 26).
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
