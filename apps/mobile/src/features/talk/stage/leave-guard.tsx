import { usePreventRemove } from "expo-router";
import { useState } from "react";
import { useTalkScreen } from "../talk-data";
import { TalkLeave } from "./talk-leave";

/**
 * Leaving a live talk asks first (back, swipe-back, a notification's way home). A talk
 * that ends with the card up (a dropped line, the silence cutoff) closes it, so it can't
 * come back by itself.
 */
export function LeaveGuard({ reduced }: { reduced: boolean }) {
	const { state, actions } = useTalkScreen();
	const [open, setOpen] = useState(false);
	usePreventRemove(state.live, () => setOpen(true));
	if (open && !state.live) {
		setOpen(false);
	}
	if (!open) {
		return null;
	}
	const choose = (end?: () => void) => {
		setOpen(false);
		end?.();
	};
	return (
		<TalkLeave
			onJustEnd={() => choose(actions.justEnd)}
			onKeep={() => choose()}
			onMirror={() => choose(actions.end)}
			reduced={reduced}
		/>
	);
}
