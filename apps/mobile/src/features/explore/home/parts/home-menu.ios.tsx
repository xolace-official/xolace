import { Button, ContextMenu, RNHostView } from "@expo/ui/swift-ui";
import type { ComponentProps, ReactElement } from "react";
import { ThemedHost } from "@/components/shared/themed-host";

type Props = {
	label: string;
	icon: ComponentProps<typeof Button>["systemImage"];
	onPress: () => void;
	children: ReactElement;
	width?: number;
};

/**
 * A one-item system context menu around RN content (@expo/ui `ContextMenu`, as Peers' card
 * menu), so the lift, blur and haptic are the system's: "Remove from here", "Don't use my
 * sessions here".
 */
export function HomeMenu({ label, icon, onPress, children, width }: Props) {
	return (
		<ThemedHost
			matchContents={{ vertical: true }}
			style={width ? { width } : undefined}
		>
			<ContextMenu>
				<ContextMenu.Items>
					{/* biome-ignore lint/a11y/useValidAriaRole: SwiftUI's button role, not an ARIA role. */}
					<Button
						label={label}
						onPress={onPress}
						role="destructive"
						systemImage={icon}
					/>
				</ContextMenu.Items>
				<ContextMenu.Trigger>
					<RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
				</ContextMenu.Trigger>
			</ContextMenu>
		</ThemedHost>
	);
}
