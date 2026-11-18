import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";

/** The back button's room from the screen's edge, each round bar button's, and UIKit's gaps
 * between items. Bar items are the same size on every iPhone. */
const BACK_WIDTH = 60;
const ITEM_WIDTH = 56;
const GAPS = 48;

/**
 * iOS: who a chat is with (the thread's Xolacer, the Xolace channel) as the bar's left item, right
 * after the back button, as in the prototype. Not the title view: UIKit centres a title view only
 * when it fits evenly between the bar's items, so the thread's jumped with each subtitle
 * ("typing…" fit and centred, "here now" didn't and went left). Screens using it keep
 * `headerBackVisible`, so the back button and the swipe stay.
 *
 * Capped: a left item that leaves too little room folds the right items, help with them, into an
 * overflow menu (the thread's did at 196pt reserved; 212 was the least that fit, 220 here). No
 * glass of its own: it reads as the header, not a button. Android's title already sits left,
 * after the back arrow, so it keeps `headerTitle`.
 */
export function HeaderIdentity({
	rightItems,
	children,
}: {
	/** How many buttons the bar holds on the right. */
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
