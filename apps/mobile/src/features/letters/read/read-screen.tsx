import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useHeaderOptions } from "@/lib/header-options";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTERS } from "../copy";
import { useReaderScreen } from "./read-data";
import { Reader } from "./reader";

/**
 * The reader (`/letters/read/[id]`): opened from the shelf, For you, the session-end card and the
 * push. A letter you've opened opens already open. Reported (from the sheet), it leaves at once:
 * the reader keeps drawing it while it closes. While it loads, it waits: nothing but the header.
 * A letter that isn't there (gone before it loaded) closes the reader too.
 */
export function ReadScreen() {
	const { state } = useReaderScreen();
	const header = useHeaderOptions("small");
	const reduced = useEffectiveReducedMotion();
	const live = state.letter;
	const [kept, setKept] = useState(live ?? null);
	if (live && live !== kept) {
		setKept(live);
	}
	const letter = live ?? kept;
	const gone = live === null;
	useEffect(() => {
		if (gone) {
			AccessibilityInfo.announceForAccessibility(LETTERS.read.gone);
			router.back();
		}
	}, [gone]);
	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={{ ...header, title: "" }} />
			{letter ? (
				<Reader key={letter.id} letter={letter} reduced={reduced} />
			) : null}
		</View>
	);
}
