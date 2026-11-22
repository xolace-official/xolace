import type { ReactNode } from "react";
import { Alert } from "react-native";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "../copy";
import { ROW } from "./chat-row";
import type { PairRowView } from "./chats-model";
import { type RowActions, rowA11yActions } from "./row-actions";

const HOLD_MS = 450;
const A11Y_LABELS = {
	archive: COPY.menu.archive,
	close: COPY.menu.close,
	delete: COPY.menu.delete,
	unarchive: COPY.menu.unarchive,
};

export function RowPress({
	row,
	actions,
	children,
}: {
	row: PairRowView;
	actions: RowActions;
	children: ReactNode;
}) {
	// Cancel first: Android lays buttons out neutral, negative, positive in array order and has no
	// destructive style, so the last slot must be an action and Delete request says what it does.
	// At most three: Close (an open chat) and Delete (a closed one) never share a row.
	const menu = () =>
		Alert.alert(row.name, undefined, [
			{ style: "cancel", text: COPY.menu.cancel },
			...(row.menu.canClose
				? [{ onPress: () => actions.close(row), text: COPY.menu.close }]
				: []),
			{
				onPress: () => {
					actions.toggleArchive(row).catch(() => undefined);
				},
				text: row.menu.archived ? COPY.menu.unarchive : COPY.menu.archive,
			},
			...(row.menu.canDelete
				? [
						{
							onPress: () => actions.askDelete(row),
							style: "destructive" as const,
							text: COPY.menu.delete,
						},
					]
				: []),
		]);
	return (
		<PressScale
			accessibilityLabel={row.a11y}
			className={ROW}
			delayLongPress={HOLD_MS}
			onLongPress={menu}
			onPress={() => actions.open(row)}
			{...rowA11yActions(row, actions, A11Y_LABELS)}
		>
			{children}
		</PressScale>
	);
}
