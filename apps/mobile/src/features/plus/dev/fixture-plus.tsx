/** The paywall's fixture adapter: the real `PlusScreen` under a provider filled from sample
 * plans. Nothing reaches the store or analytics; Continue free goes back. */
import { router } from "expo-router";
import type { PlanId, Plans } from "@/features/purchases/plans";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import type { Side } from "../compare/side-switch";
import { type Plus, PlusProvider } from "../plus-data";
import { featureRows, surfaceLine } from "../plus-model";
import { PlusScreen } from "../plus-screen";
import { TRIAL } from "./sample-plans";

const ignore = () => undefined;
const ACTIONS: Plus["actions"] = {
	buy: ignore,
	leave: () =>
		router.canGoBack() ? router.back() : router.replace("/(protected)"),
	restore: ignore,
	retry: ignore,
};

export function FixturePlus({
	plans = TRIAL,
	surface,
	side,
	plan,
	unavailable = false,
	retrying = false,
	buying = false,
	restoring = false,
	owned = false,
}: {
	plans?: Plans;
	surface?: PaywallSurface;
	/** Which side of the week it opens on. */
	side?: Side;
	/** The plan held picked. */
	plan?: PlanId;
	unavailable?: boolean;
	retrying?: boolean;
	buying?: boolean;
	restoring?: boolean;
	owned?: boolean;
}) {
	const value: Plus = {
		actions: ACTIONS,
		state: {
			buying,
			exiting: false,
			features: featureRows(surface),
			line: surfaceLine(surface, "Flux"),
			owned,
			plans,
			restoring,
			retrying,
			unavailable,
		},
	};
	return (
		<PlusProvider value={value}>
			<PlusScreen plan={plan} side={side} />
		</PlusProvider>
	);
}
