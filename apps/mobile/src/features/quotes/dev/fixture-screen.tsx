import { QuotesScreen } from "@/features/quotes/quotes-screen";
import {
	type QuotesActions,
	QuotesScreenProvider,
	type QuotesState,
} from "@/features/quotes/quotes-screen-data";

const ignore = () => undefined;
const ACTIONS: QuotesActions = {
	answerOffer: () => Promise.resolve(null),
	close: ignore,
	keptAt: ignore,
	offerShown: ignore,
	openPlus: ignore,
	pickBackground: () => Promise.resolve(true),
	prepareShare: ignore,
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
