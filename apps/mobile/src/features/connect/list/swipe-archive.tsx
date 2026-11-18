import { type ReactNode, useRef } from "react";
import { View } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { PairRowView } from "./chats-model";
import type { RowActions } from "./row-actions";

const ARCHIVE = { android: "archive", ios: "archivebox" } as const;
const UNARCHIVE = { android: "unarchive", ios: "tray.and.arrow.up" } as const;
const ACTION_WIDTH = 88;

/**
 * Production's trailing swipe: archive on Connect, unarchive on Archived. Releasing past half
 * the action commits; rightward drags never start, so the stack's back swipe stays free.
 */
export function SwipeArchive({
	row,
	actions,
	children,
}: {
	row: PairRowView;
	actions: RowActions;
	children: ReactNode;
}) {
	const swipeable = useRef<SwipeableMethods>(null);
	const ink = useTokenColor("accent-foreground");
	const archived = row.menu.archived;

	// `openRight()` re-fires `onSwipeableWillOpen` on an open row, so this latches to one haptic
	// and one call. A row that survives it (a failure, or activity keeping it listed) slides
	// shut and unlatches.
	const committed = useRef(false);
	const commit = () => {
		if (committed.current) {
			return;
		}
		committed.current = true;
		playSoftPress();
		actions
			.toggleArchive(row, { haptic: false })
			.catch(() => false)
			.finally(() => {
				committed.current = false;
				swipeable.current?.close();
			});
	};

	return (
		<ReanimatedSwipeable
			dragOffsetFromLeft={Number.MAX_SAFE_INTEGER}
			friction={2}
			onSwipeableWillOpen={commit}
			overshootRight={false}
			ref={swipeable}
			renderRightActions={() => (
				// The row carries this as an accessibility action.
				<View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
				>
					<PressScale
						className="h-full items-center justify-center gap-1 bg-accent"
						onPress={() => swipeable.current?.openRight()}
						style={{ width: ACTION_WIDTH }}
					>
						<Icon color={ink} name={archived ? UNARCHIVE : ARCHIVE} size={20} />
						<AppText
							color="accentForeground"
							variant="caption"
							weight="semibold"
						>
							{archived ? COPY.menu.unarchive : COPY.menu.archive}
						</AppText>
					</PressScale>
				</View>
			)}
			rightThreshold={ACTION_WIDTH / 2}
		>
			{children}
		</ReanimatedSwipeable>
	);
}
