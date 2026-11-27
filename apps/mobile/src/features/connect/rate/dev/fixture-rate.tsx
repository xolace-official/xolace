import { RateProvider, type RateScreenData } from "../rate-data";
import { RateScreen } from "../rate-screen";

const ACTIONS: RateScreenData["actions"] = {
	send: () => undefined,
	skip: () => undefined,
};

export function FixtureRate({
	conversation,
}: {
	conversation: RateScreenData["state"]["conversation"];
}) {
	return (
		<RateProvider value={{ actions: ACTIONS, state: { conversation } }}>
			<RateScreen />
		</RateProvider>
	);
}
