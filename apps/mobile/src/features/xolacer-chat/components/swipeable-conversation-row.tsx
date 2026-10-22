import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { type ReactNode, useRef } from "react";
import { type ColorValue, View } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";
import type { PairConversation } from "@/src/features/xolacer-chat/components/chats-list";
import { playSoftPress } from "@/src/lib/haptics";

const ARCHIVE_ICON = {
	android: "archive",
	ios: "archivebox",
	web: "archive",
} as const;
const UNARCHIVE_ICON = {
	android: "unarchive",
	ios: "tray.and.arrow.up",
	web: "unarchive",
} as const;
const ACTION_WIDTH = 88;

export type ArchiveHandler = (
	conversation: PairConversation,
	options?: { haptic?: boolean }
) => Promise<boolean>;

/**
 * The swipe's mirror for assistive tech: the same archive the gesture does,
 * plus the long-press sheet as a named action, so a swipe is never the only
 * way to anything.
 */
export function rowAccessibilityActions(
	conversation: PairConversation,
	onArchive: ArchiveHandler,
	onLongPress?: () => void
) {
	const archiveName = conversation.archived ? "unarchive" : "archive";
	return {
		accessibilityActions: [
			{
				label: conversation.archived ? "Unarchive" : "Archive",
				name: archiveName,
			},
			...(onLongPress ? [{ label: "More actions", name: "longpress" }] : []),
		],
		onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
			if (event.nativeEvent.actionName === archiveName) {
				void onArchive(conversation);
			} else if (event.nativeEvent.actionName === "longpress") {
				onLongPress?.();
			}
		},
	};
}

/**
 * Trailing swipe on a pair row: archive on Connect, unarchive on the Archived
 * screen. Mail-style — releasing past the threshold commits, so a row is never
 * left sitting open; tapping the revealed action commits too. Undo lives in
 * the toast `onArchive` raises, not here.
 *
 * Rightward drags never activate, which keeps the left edge free for the
 * stack's back swipe.
 */
export function SwipeableConversationRow({
	conversation,
	onArchive,
	children,
}: {
	conversation: PairConversation;
	onArchive: ArchiveHandler;
	children: ReactNode;
}) {
	const swipeable = useRef<SwipeableMethods>(null);
	const accent = useCSSVariable("--color-accent-foreground");
	// RNGH 3 keeps the actions mounted behind the row (absoluteFill), so the row
	// must be opaque or the action shows through at rest. Matches the host
	// screens' `bg-background`.
	const background = useCSSVariable("--color-background");
	const label = conversation.archived ? "Unarchive" : "Archive";

	// The revealed action's `openRight()` re-fires `onSwipeableWillOpen` while
	// the row is already open, so this ref is the latch: one haptic, one
	// mutation. Usually the row leaves the list, but a row can survive the call:
	// it failed, or activity after the archive stamp keeps `isArchivedFor` false.
	// A surviving row slides shut and unlatches once the call settles.
	const committed = useRef(false);
	const commit = () => {
		if (committed.current) {
			return;
		}
		committed.current = true;
		playSoftPress();
		void onArchive(conversation, { haptic: false }).finally(() => {
			committed.current = false;
			swipeable.current?.close();
		});
	};

	return (
		<ReanimatedSwipeable
			childrenContainerStyle={{ backgroundColor: background as ColorValue }}
			dragOffsetFromLeft={Number.MAX_SAFE_INTEGER}
			friction={2}
			onSwipeableWillOpen={commit}
			overshootRight={false}
			ref={swipeable}
			renderRightActions={() => (
				<PressableFeedback
					// The row itself carries this as an accessibility action.
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					onPress={() => swipeable.current?.openRight()}
				>
					<View
						className="h-full items-center justify-center gap-1 bg-accent"
						style={{ width: ACTION_WIDTH }}
					>
						<SymbolView
							name={conversation.archived ? UNARCHIVE_ICON : ARCHIVE_ICON}
							size={20}
							tintColor={accent as ColorValue}
						/>
						<AppText className="font-semibold text-[11px] text-accent-foreground">
							{label}
						</AppText>
					</View>
				</PressableFeedback>
			)}
			rightThreshold={ACTION_WIDTH / 2}
		>
			{children}
		</ReanimatedSwipeable>
	);
}
