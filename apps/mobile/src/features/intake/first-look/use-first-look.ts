import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import {
	INTAKE_PLUS_SURFACE,
	trackPlusContinuedFree,
	trackPlusPlanPicked,
	trackPlusPurchased,
	trackPlusRowOpened,
	trackPlusShown,
	trackTalkDemoOpened,
} from "@/features/intake/analytics";
import type { PlusOutcome } from "@/features/intake/v2/machine";
import { defaultPlan, startsTrial } from "@/features/purchases/plans";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { usePlans } from "@/features/purchases/use-plans";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useSingleFlight } from "@/lib/use-single-flight";
import type { RowId } from "./copy";
import type { FirstLookValue } from "./first-look-data";
import { keepTalkingLabel, saidWords } from "./first-look-model";

export type FirstLookStepProps = {
	answer: string;
	busy: boolean;
	onExit: (outcome: PlusOutcome) => void;
	onSafetyExit: (outcome?: "purchased") => void;
	onStoreCall: (active: boolean) => void;
};

type Demo = {
	label: string;
	onClose: () => void;
	onKeepTalking: () => void;
	onSafety: () => void;
	open: boolean;
};

export function useFirstLook({
	answer,
	busy,
	onExit,
	onSafetyExit,
	onStoreCall,
}: FirstLookStepProps): FirstLookValue & { demo: Demo } {
	const posthog = usePostHog();
	const { status, isPlus } = usePlusEntitlement();
	const { restorePurchases } = useRevenueCat();
	const { isLoading, plans, purchase, refreshOfferings, unavailable } =
		usePlans();
	const [picked, setPicked] = useState<PlanId | null>(null);
	const purchasing = useSingleFlight();
	const buying = purchasing.busy;
	const [restoring, setRestoring] = useState(false);
	const [retrying, setRetrying] = useState(false);
	const [demoOpen, setDemoOpen] = useState(false);
	const plan = picked ?? defaultPlan(plans);
	const demoSafety = useRef(false);
	const settled = useRef(false);
	const purchased = useRef(false);
	const shown = useRef(false);

	useEffect(() => {
		if (status === "loading") {
			return;
		}
		if (isPlus && !settled.current && !demoOpen && !buying) {
			settled.current = true;
			onExit("entitled");
			return;
		}
		if (!(isPlus || shown.current)) {
			shown.current = true;
			trackPlusShown(posthog);
		}
	}, [buying, demoOpen, isPlus, status, onExit, posthog]);

	const buy = async () => {
		const pkg = plans[plan].pkg;
		if (!pkg || isPlus) {
			return;
		}
		const trial = startsTrial(plan, plans);
		await purchasing.run(() => {
			onStoreCall(true);
			return purchase(pkg, INTAKE_PLUS_SURFACE)
				.then((ok) => {
					if (!ok) {
						return;
					}
					trackPlusPurchased(posthog, plan, trial);
					purchased.current = true;
					settled.current = true;
					if (demoSafety.current) {
						setDemoOpen(true);
					} else {
						onExit("purchased");
					}
				})
				.finally(() => {
					onStoreCall(false);
					if (demoSafety.current && !settled.current) {
						setDemoOpen(true);
					}
				});
		});
	};

	const restore = async () => {
		if (restoring || buying) {
			return;
		}
		setRestoring(true);
		onStoreCall(true);
		try {
			await restorePurchases();
		} finally {
			setRestoring(false);
			onStoreCall(false);
		}
	};

	const retry = async () => {
		setRetrying(true);
		try {
			await refreshOfferings();
		} finally {
			setRetrying(false);
		}
	};

	return {
		actions: {
			buy: () => void buy(),
			continueFree: () => {
				settled.current = true;
				trackPlusContinuedFree(posthog, shown.current);
				onExit("dismissed");
			},
			pick: (next) => {
				if (next !== plan) {
					trackPlusPlanPicked(posthog, next);
				}
				setPicked(next);
			},
			restore: () => void restore(),
			retry: () => void retry(),
			rowOpened: (row: RowId) => trackPlusRowOpened(posthog, row),
			tryTalk: busy
				? undefined
				: () => {
						trackTalkDemoOpened(posthog);
						setDemoOpen(true);
					},
		},
		demo: {
			label: keepTalkingLabel(plan, plans),
			onClose: () => {
				setDemoOpen(false);
				if (demoSafety.current) {
					settled.current = true;
					onSafetyExit(purchased.current ? "purchased" : undefined);
				}
			},
			onKeepTalking: () => {
				setDemoOpen(false);
				void buy();
			},
			onSafety: () => {
				demoSafety.current = true;
				if (!(settled.current || purchasing.isBusy())) {
					setDemoOpen(true);
				}
			},
			open: demoOpen,
		},
		state: {
			busy,
			buying,
			owned: isPlus,
			plan,
			plans,
			restoring,
			retrying: retrying || isLoading,
			said: saidWords(answer),
			unavailable,
		},
	};
}
