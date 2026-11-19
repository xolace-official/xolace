/** The screen's fixture adapter: the real `QuotesScreen` under a provider filled from fixtures.
 * Taps that only change the screen's own UI (sheets, Clear view, the heart's burst) play; taps
 * that would write change nothing and reach nothing. */
import { QuotesScreen } from "@/features/quotes/quotes-screen";
import {
	type QuotesActions,
	QuotesScreenProvider,
	type QuotesState,
} from "@/features/quotes/quotes-screen-data";

const ignore = () => undefined;
const ACTIONS: QuotesActions = {
	close: ignore,
	keptAt: ignore,
	openPlus: ignore,
	pickBackground: () => Promise.resolve(true),
	reflect: ignore,
	reply: () => Promise.resolve("sent"),
	retry: ignore,
	saveImage: () => Promise.resolve(null),
	setResonated: ignore,
	setSaved: () => Promise.resolve(true),
	setSoundOn: ignore,
	shareImage: () => Promise.resolve(null),
	talk: ignore,
};

export function FixtureScreen({ state }: { state: QuotesState }) {
	return (
		<QuotesScreenProvider value={{ actions: ACTIONS, state }}>
			<QuotesScreen />
		</QuotesScreenProvider>
	);
}
