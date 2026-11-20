import { usePreventRemove } from "expo-router";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { useTalkScreen } from "../talk-data";
import { TalkLeave } from "./talk-leave";

export function LeaveGuard({
	reduced,
	children,
}: {
	reduced: boolean;
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
