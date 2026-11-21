import type { ReactElement } from "react";
import { Alert, Pressable } from "react-native";
import { COPY } from "../copy";

const HOLD_MS = 450;

type Props = {
	onReport: () => void;
	onHide: () => void;
	children: ReactElement;
};

export function CardMenu({ onReport, onHide, children }: Props) {
	const open = () =>
		Alert.alert("", undefined, [
			{ onPress: onReport, text: COPY.menu.report },
			{ onPress: onHide, text: COPY.menu.hide },
			{ style: "cancel", text: COPY.menu.cancel },
		]);
	return (
		<Pressable accessible={false} delayLongPress={HOLD_MS} onLongPress={open}>
			{children}
		</Pressable>
	);
}
