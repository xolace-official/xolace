import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";

const BACK_WIDTH = 60;
const ITEM_WIDTH = 56;
const GAPS = 48;

export function HeaderIdentity({
	rightItems,
	children,
}: {
	rightItems: number;
	children: ReactNode;
}) {
	const { width } = useWindowDimensions();
	return (
		<Stack.Toolbar placement="left">
			<Stack.Toolbar.View hidesSharedBackground>
				<View
					style={{
						maxWidth: width - BACK_WIDTH - rightItems * ITEM_WIDTH - GAPS,
					}}
				>
					{children}
				</View>
			</Stack.Toolbar.View>
		</Stack.Toolbar>
	);
}
