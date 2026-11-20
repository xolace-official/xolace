import {
	type SteadinessCard,
	steadinessCard,
} from "@/features/you/home/steadiness/steadiness-model";
import { useInsightsView } from "@/features/you/use-insights-view";

export function useYouSteadiness(): SteadinessCard | undefined {
	const { view, plus, now } = useInsightsView();
	return view ? steadinessCard(view, plus, now) : undefined;
}
