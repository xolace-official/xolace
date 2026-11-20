import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useHeaderOptions } from "@/lib/header-options";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { readerGoneLine } from "../letters-model";
import { leaveReader } from "../letters-routes";
import { useReaderScreen } from "./read-data";
import { Reader } from "./reader";

export function ReadScreen({ fromPush = false }: { fromPush?: boolean }) {
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
	const hadIt = kept !== null;
	useEffect(() => {
		if (gone) {
			AccessibilityInfo.announceForAccessibility(readerGoneLine(hadIt));
			leaveReader(fromPush);
		}
	}, [gone, hadIt, fromPush]);
	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={{ ...header, title: "" }} />
			{letter ? (
				<Reader key={letter.id} letter={letter} reduced={reduced} />
			) : null}
		</View>
	);
}
