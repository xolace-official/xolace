import { useLocalSearchParams } from "expo-router";
import { QuotesScreen } from "@/features/quotes/quotes-screen";
import { QuotesScreenData } from "@/features/quotes/quotes-screen-data";

export default function QuotesRoute() {
	const { view, quote } = useLocalSearchParams<{
		view?: string;
		quote?: string;
	}>();
	return (
		<QuotesScreenData
			initialUi={view === "kept" ? { view: "kept" } : undefined}
			tappedQuoteId={quote}
		>
			<QuotesScreen />
		</QuotesScreenData>
	);
}
