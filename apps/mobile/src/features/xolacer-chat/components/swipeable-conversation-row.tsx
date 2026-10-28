import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { type ReactNode, useRef } from "react";
import { type ColorValue, View } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import type { PairConversation } from "@/features/xolacer-chat/components/chats-list";
import { playSoftPress } from "@/lib/haptics";

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

/** The swipe's mirror for assistive tech: archive plus the long-press sheet as named actions. */
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

/** Trailing swipe: archive on Connect, unarchive on Archived. Releasing past the threshold
 * commits; rightward drags never activate, so the stack's back swipe stays free. */
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
	// RNGH 3 keeps the actions mounted behind the row, so the row must be opaque
	// or the action shows through at rest.
	const background = useCSSVariable("--color-background");
	const label = conversation.archived ? "Unarchive" : "Archive";

	// `openRight()` re-fires `onSwipeableWillOpen` on an already-open row, so this
	// latches to one haptic and one mutation. A row that survives the call
	// (failure, or activity keeping `isArchivedFor` false) slides shut and unlatches.
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
