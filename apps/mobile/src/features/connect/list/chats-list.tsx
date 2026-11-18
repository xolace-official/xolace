import { View } from "react-native";
import Animated, {
	FadeOut,
	LinearTransition,
	ReduceMotion,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { ChannelRow, ChatRowBody } from "./chat-row";
import type { ChatRowView } from "./chats-model";
import type { RowActions } from "./row-actions";
import { RowPress } from "./row-press";
import { SwipeArchive } from "./swipe-archive";

/** Archiving or restoring a chat slides the rows below it into place over 240 ms. */
const REFLOW_MS = 240;
const EXIT_MS = 200;
const ARCHIVE = { android: "archive", ios: "archivebox" } as const;

export type EmptyNote = { title: string; body: string; browse?: () => void };

/**
 * Chats: the channel pinned, the chats, the archive at the bottom (the prototype's list).
 * A tap opens, a hold opens the menu, a trailing swipe archives.
 */
export function ChatsList({
	rows,
	actions,
	archived,
	empty,
}: {
	rows: readonly ChatRowView[];
	actions: RowActions;
	/** The way into Archived, when anything is there. */
	archived?: { count: number; open: () => void };
	empty?: EmptyNote | null;
}) {
	const reduced = useEffectiveReducedMotion();
	const muted = useTokenColor("muted");
	const reflow = reduced
		? undefined
		: LinearTransition.duration(REFLOW_MS).reduceMotion(ReduceMotion.Never);
	const exit = reduced
		? undefined
		: FadeOut.duration(EXIT_MS).reduceMotion(ReduceMotion.Never);

	return (
		<View>
			{rows.map((row) =>
				row.kind === "broadcast" ? (
					<ChannelRow
						key={row.id}
						onPress={() => actions.open(row)}
						row={row}
					/>
				) : (
					<Animated.View exiting={exit} key={row.id} layout={reflow}>
						<SwipeArchive actions={actions} row={row}>
							<RowPress actions={actions} row={row}>
								<ChatRowBody row={row} />
							</RowPress>
						</SwipeArchive>
					</Animated.View>
				)
			)}

			{empty ? <EmptyChats note={empty} /> : null}

			{/* Moves with the rows above it, so it never overlaps the last chat mid-slide. */}
			{archived && archived.count > 0 ? (
				<Animated.View layout={reflow}>
					<PressScale
						accessibilityLabel={COPY.archivedRow.a11y(archived.count)}
						className="flex-row items-center gap-2.5 px-1 py-4"
						haptic={playSoftPress}
						onPress={archived.open}
					>
						<Icon color={muted} name={ARCHIVE} size={16} />
						<AppText className="text-[15.5px]" color="muted" variant="callout">
							{COPY.archivedRow.label(archived.count)}
						</AppText>
					</PressScale>
				</Animated.View>
			) : null}
		</View>
	);
}

/** No chats yet, or all of them archived: a quiet note under the channel. */
function EmptyChats({ note }: { note: EmptyNote }) {
	return (
		<View className="items-center gap-2 px-6 py-12">
			<AppText center variant="headline">
				{note.title}
			</AppText>
			<AppText center className="max-w-70" color="muted" variant="callout">
				{note.body}
			</AppText>
			{note.browse ? (
				<PressScale
					accessibilityLabel={COPY.empty.browse}
					className="mt-2 min-h-11 justify-center px-3"
					haptic={playSoftPress}
					onPress={note.browse}
				>
					<AppText color="accentInk" variant="callout" weight="semibold">
						{`${COPY.empty.browse} →`}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}
