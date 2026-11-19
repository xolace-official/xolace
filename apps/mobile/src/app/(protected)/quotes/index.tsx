import { useLocalSearchParams } from "expo-router";
import { QuotesScreen } from "@/features/quotes/quotes-screen";
import { QuotesScreenData } from "@/features/quotes/quotes-screen-data";

export default function QuotesRoute() {
	const { view } = useLocalSearchParams<{ view?: string }>();
	return (
		<QuotesScreenData
			initialUi={view === "kept" ? { view: "kept" } : undefined}
		>
			<QuotesScreen />
		</QuotesScreenData>
	);
}
