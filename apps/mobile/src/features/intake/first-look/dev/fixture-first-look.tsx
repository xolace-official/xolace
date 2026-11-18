// The first look on fixtures: sample plans, no store, no analytics. Picking a plan works so the
// frame can be seen sliding; every other tap does nothing.
import { useState } from "react";
import type { Plans } from "@/features/purchases/plans";
import { defaultPlan } from "@/features/purchases/plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { FirstLookProvider, type FirstLookValue } from "../first-look-data";
import { saidWords } from "../first-look-model";
import { FirstLookScreen } from "../first-look-screen";
import type { SceneHold } from "../use-first-look-scene";
import { TRIAL_AND_DISCOUNT } from "./sample-plans";

const SAMPLE_SAID = saidWords("Work won’t leave my head.");

type Props = Partial<Omit<FirstLookValue["state"], "plan" | "plans">> & {
	hold?: SceneHold;
	plan?: PlanId;
	plans?: Plans;
};

const nothing = () => undefined;

export function FixtureFirstLook({
	hold,
	plan,
	plans = TRIAL_AND_DISCOUNT,
	...state
}: Props) {
	const [picked, setPicked] = useState<PlanId>(plan ?? defaultPlan(plans));
	const value: FirstLookValue = {
		actions: {
			buy: nothing,
			continueFree: nothing,
			pick: setPicked,
			restore: nothing,
			retry: nothing,
			rowOpened: nothing,
			tryTalk: nothing,
		},
		state: {
			busy: false,
			buying: false,
			owned: false,
			restoring: false,
			retrying: false,
			said: SAMPLE_SAID,
			unavailable: false,
			...state,
			plan: picked,
			plans,
		},
	};
	return (
		<FirstLookProvider value={value}>
			<FirstLookScreen hold={hold} />
		</FirstLookProvider>
	);
}
