import { usePreventRemove } from "expo-router";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { useTalkScreen } from "../talk-data";
import { TalkLeave } from "./talk-leave";

/**
 * Leaving a live talk asks first (back, swipe-back, a notification's way home). A talk
 * that ends with the card up (a dropped line, the silence cutoff) closes it, so it can't
 * come back by itself. While the card is up the talk under it is hidden from screen
 * readers (VoiceOver and TalkBack), so the card is modal for both.
 */
export function LeaveGuard({
	reduced,
	children,
}: {
	reduced: boolean;
	/** The talk the card covers. */
	children: ReactNode;
}) {
	const { state, actions } = useTalkScreen();
	const [open, setOpen] = useState(false);
	usePreventRemove(state.live, () => setOpen(true));
	if (open && !state.live) {
		setOpen(false);
	}
	const choose = (end?: () => void) => {
		setOpen(false);
		end?.();
	};
	return (
		<>
			<View
				accessibilityElementsHidden={open}
				className="flex-1"
				importantForAccessibility={open ? "no-hide-descendants" : "auto"}
			>
				{children}
			</View>
			{open ? (
				<TalkLeave
					onJustEnd={() => choose(actions.justEnd)}
					onKeep={() => choose()}
					onMirror={() => choose(actions.end)}
					reduced={reduced}
				/>
			) : null}
		</>
	);
}
