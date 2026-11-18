import { Button, ContextMenu, RNHostView } from "@expo/ui/swift-ui";
import { type ReactNode, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { PressScale } from "@/components/shared/press-scale";
import { ThemedHost } from "@/components/shared/themed-host";
import { COPY } from "../copy";
import { ROW } from "./chat-row";
import type { PairRowView } from "./chats-model";
import { type RowActions, rowA11yActions } from "./row-actions";

/** The page's side gutter: the row's width before its slot is measured. */
const GUTTER = 16;
const A11Y_LABELS = {
	archive: COPY.menu.archive,
	close: COPY.menu.close,
	delete: COPY.menu.delete,
	unarchive: COPY.menu.unarchive,
};

/**
 * A chat row's press: tap opens the thread, a hold opens the system context menu with
 * production's actions: Close for a Xolacer's open chat, Archive or Unarchive, and Delete
 * request on a declined or expired one. @expo/ui's SwiftUI `ContextMenu` around the RN row,
 * so the lift, blur and haptic are the system's. Not expo-router's `Link.Menu` (the
 * prototype's): its trigger hides the row from VoiceOver.
 */
export function RowPress({
	row,
	actions,
	children,
}: {
	row: PairRowView;
	actions: RowActions;
	children: ReactNode;
}) {
	// The SwiftUI host sizes its RN child by content, so a long line would widen the row past
	// the screen: the row takes the width its slot measures instead.
	const screen = useWindowDimensions().width;
	const [measured, setMeasured] = useState<number | null>(null);
	const width = measured ?? screen - GUTTER * 2;
	return (
		<View onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}>
			<ThemedHost matchContents={{ vertical: true }}>
				<ContextMenu>
					<ContextMenu.Items>
						{row.menu.canClose ? (
							<Button
								label={COPY.menu.close}
								onPress={() => actions.close(row)}
								systemImage="moon"
							/>
						) : null}
						<Button
							label={
								row.menu.archived ? COPY.menu.unarchive : COPY.menu.archive
							}
							onPress={() => {
								actions.toggleArchive(row).catch(() => undefined);
							}}
							systemImage={
								row.menu.archived ? "tray.and.arrow.up" : "archivebox"
							}
						/>
						{row.menu.canDelete ? (
							// biome-ignore lint/a11y/useValidAriaRole: SwiftUI's button role, not an ARIA role.
							<Button
								label={COPY.menu.delete}
								onPress={() => actions.askDelete(row)}
								role="destructive"
								systemImage="trash"
							/>
						) : null}
					</ContextMenu.Items>
					<ContextMenu.Trigger>
						<RNHostView matchContents={{ vertical: true }}>
							<PressScale
								accessibilityLabel={row.a11y}
								className={ROW}
								onPress={() => actions.open(row)}
								style={{ width }}
								{...rowA11yActions(row, actions, A11Y_LABELS)}
							>
								{children}
							</PressScale>
						</RNHostView>
					</ContextMenu.Trigger>
				</ContextMenu>
			</ThemedHost>
		</View>
	);
}
