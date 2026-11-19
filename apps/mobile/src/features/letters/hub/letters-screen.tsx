import { Stack } from "expo-router";
import { ScrollView } from "react-native";
import { useHeaderOptions } from "@/lib/header-options";
import { LETTERS } from "../copy";
import { ForYouSection } from "./for-you-section";
import { SentSection } from "./sent-section";
import { WriteEntry } from "./write-entry";

/** While the Letters screen's data loads: its header, nothing under it. */
export function LettersLoading() {
	const header = useHeaderOptions("large");
	return <Stack.Screen options={{ ...header, title: LETTERS.title }} />;
}

/**
 * The Letters screen (handoff §1), pushed with the large title "Letters": the write card (or the
 * limit line), For you (with Hidden · N), then Sent, the private list, and its footnote.
 */
export function LettersScreen() {
	const header = useHeaderOptions("large");
	return (
		<>
			<Stack.Screen options={{ ...header, title: LETTERS.title }} />
			<ScrollView
				contentContainerClassName="pt-2 pb-16"
				contentInsetAdjustmentBehavior="automatic"
			>
				<WriteEntry />
				<ForYouSection />
				<SentSection />
			</ScrollView>
		</>
	);
}
