import { Button, ContextMenu, RNHostView } from "@expo/ui/swift-ui";
import type { ReactElement } from "react";
import { ThemedHost } from "@/components/shared/themed-host";
import { COPY } from "../copy";

type Props = {
	onReport: () => void;
	onHide: () => void;
	children: ReactElement;
};

/**
 * Hold to report (board card 05): the system context menu, @expo/ui's SwiftUI
 * `ContextMenu` around the RN card (`RNHostView matchContents`), so the lift,
 * blur and haptic are the system's. Report… opens production's form sheet;
 * Hide this folds the card away.
 */
export function CardMenu({ onReport, onHide, children }: Props) {
	return (
		<ThemedHost matchContents={{ vertical: true }}>
			<ContextMenu>
				<ContextMenu.Items>
					<Button
						label={COPY.menu.report}
						onPress={onReport}
						systemImage="exclamationmark.bubble"
					/>
					<Button
						label={COPY.menu.hide}
						onPress={onHide}
						systemImage="eye.slash"
					/>
				</ContextMenu.Items>
				<ContextMenu.Trigger>
					<RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
				</ContextMenu.Trigger>
			</ContextMenu>
		</ThemedHost>
	);
}
