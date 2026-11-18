/** The Steadiness card's read: the insights view You and the Steadiness screen share. */
import {
	type SteadinessCard,
	steadinessCard,
} from "@/features/you/home/steadiness/steadiness-model";
import { useInsightsView } from "@/features/you/use-insights-view";

/** Undefined while it loads. */
export function useYouSteadiness(): SteadinessCard | undefined {
	const { view, plus, now } = useInsightsView();
	return view ? steadinessCard(view, plus, now) : undefined;
}
