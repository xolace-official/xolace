import { Stack } from "expo-router";
import { ScrollView } from "react-native";
import { useHeaderOptions } from "@/lib/header-options";
import { LETTERS } from "../copy";
import { ForYouSection } from "./for-you-section";
import { SentSection } from "./sent-section";
import { WriteEntry } from "./write-entry";

export function LettersLoading() {
	const header = useHeaderOptions("large");
	return <Stack.Screen options={{ ...header, title: LETTERS.title }} />;
}

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
