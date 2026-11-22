import { Stack } from "expo-router";
import { useLargeHeaderOptions } from "@/lib/navigation-options";

export const unstable_settings = { anchor: "index" };

const EXPLORE_OPTIONS = { title: "Explore" };
const SUB_OPTIONS = {
	headerBackButtonDisplayMode: "minimal" as const,
	headerLargeTitle: false,
	title: "",
};

export default function ExploreLayout() {
	const largeHeaderOptions = useLargeHeaderOptions();

	return (
		<Stack screenOptions={largeHeaderOptions}>
			<Stack.Screen name="index" options={EXPLORE_OPTIONS} />
			<Stack.Screen name="list" options={SUB_OPTIONS} />
			<Stack.Screen
				name="topics"
				options={{ ...SUB_OPTIONS, title: "Topics" }}
			/>
			<Stack.Screen name="topic/[slug]" options={SUB_OPTIONS} />
			<Stack.Screen name="search" options={SUB_OPTIONS} />
			<Stack.Screen
				name="library/index"
				options={{ headerBackButtonDisplayMode: "minimal", title: "Lantern" }}
			/>
			<Stack.Screen name="library/hub/[slug]" options={SUB_OPTIONS} />
			<Stack.Screen name="library/kind/[kind]" options={SUB_OPTIONS} />
			<Stack.Screen name="library/subject/[slug]" options={SUB_OPTIONS} />
			<Stack.Screen
				name="library/subjects"
				options={{ ...SUB_OPTIONS, title: "Subjects" }}
			/>
			<Stack.Screen
				name="library/saved"
				options={{ ...SUB_OPTIONS, title: "Saved" }}
			/>
		</Stack>
	);
}
