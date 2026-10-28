import { Stack } from "expo-router";
import { useLargeHeaderOptions } from "@/lib/navigation-options";

// The hub sits under every deep jump into Browse that passes `withAnchor`,
// so Library / Music / a topic always has a back button and a tab re-tap pops
// to the hub instead of being the stack's root.
export const unstable_settings = { anchor: "index" };

const BROWSE_OPTIONS = { title: "Browse" };
// Sub-screens keep the regular (non-large) title; the hub owns the large one.
const SUB_OPTIONS = {
	headerBackButtonDisplayMode: "minimal" as const,
	headerLargeTitle: false,
	title: "",
};

export default function BrowseLayout() {
	const largeHeaderOptions = useLargeHeaderOptions();

	return (
		<Stack screenOptions={largeHeaderOptions}>
			<Stack.Screen name="index" options={BROWSE_OPTIONS} />
			<Stack.Screen name="list" options={SUB_OPTIONS} />
			<Stack.Screen
				name="topics"
				options={{ ...SUB_OPTIONS, title: "Topics" }}
			/>
			<Stack.Screen name="topic/[slug]" options={SUB_OPTIONS} />
			<Stack.Screen name="search" options={SUB_OPTIONS} />
			{/* Lantern (#409): the Library home keeps a large title of its own */}
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
		</Stack>
	);
}
