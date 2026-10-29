import MoreVert from "@expo/material-symbols/more_vert.xml";
import { Stack } from "expo-router";
import type { ReactNode } from "react";

/** Native header-right overflow menu for per-screen actions. Destructive styling is iOS-only. */
export function OverflowMenu({ children }: { children: ReactNode }) {
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu
				accessibilityLabel="More options"
				icon={process.env.EXPO_OS === "ios" ? "ellipsis" : MoreVert}
			>
				{children}
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	);
}

OverflowMenu.Action = Stack.Toolbar.MenuAction;
