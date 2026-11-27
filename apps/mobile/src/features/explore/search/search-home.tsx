import { Stack } from "expo-router";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { SEARCH } from "@/features/explore/copy";
import { useDebounce } from "@/lib/use-debounce";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

/**
 * Explore's search bar over its home. While someone types, the home stays mounted but
 * hidden and `results` draws the debounced query's results in its place.
 */
export function SearchHome({
	children,
	results,
}: {
	children: ReactNode;
	results: (query: string) => ReactNode;
}) {
	const [text, setText] = useState("");
	const searching = text.trim() !== "";
	const query = useDebounce(text.trim(), searching ? DEBOUNCE_MS : 0);

	return (
		<>
			{/* Always shown under the title, as the handoff draws it (explore.md). */}
			<Stack.SearchBar
				hideWhenScrolling={false}
				onCancelButtonPress={() => setText("")}
				onChangeText={(e) => setText(e.nativeEvent.text)}
				onClose={() => setText("")}
				placeholder={SEARCH.placeholder}
			/>
			<View className={cn("flex-1", searching && "hidden")}>{children}</View>
			{searching && results(query)}
		</>
	);
}
