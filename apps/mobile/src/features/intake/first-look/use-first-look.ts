// The first look's data hook: the store's plans, the purchase and restore, Xolace+ already
// being theirs, the Talk demo's safety verdict, and the analytics. Kept from the step it
// replaces ("Same week, two ways", #713), less its Free/Plus switch.
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
import type { RowId } from "./copy";
import type { FirstLookValue } from "./first-look-data";
import { keepTalkingLabel, saidWords } from "./first-look-model";

export type FirstLookStepProps = {
	/** What they told Flux, for "You said …"; empty when they skipped. */
	answer: string;
	/** The intake is being saved after this step: nothing may be tapped again. */
	busy: boolean;
	onExit: (outcome: PlusOutcome) => void;
	/** On from crisis support in the Talk demo: past this step, nothing sold. `purchased` when
	 * a purchase finished while the verdict waited for it. */
	onSafetyExit: (outcome?: "purchased") => void;
	/** A purchase or restore starting or ending: nothing may interrupt one. */
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
	const { isPlus, isResolved } = usePlusEntitlement();
	const { restorePurchases } = useRevenueCat();
	const { isLoading, plans, purchase, refreshOfferings, unavailable } =
		usePlans();
	const [picked, setPicked] = useState<PlanId | null>(null);
	const [buying, setBuying] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [retrying, setRetrying] = useState(false);
	const [demoOpen, setDemoOpen] = useState(false);
	// Until the store answers, the default follows what it sells; a tap pins it.
	const plan = picked ?? defaultPlan(plans);
	// The demo's safeguard tripped: its close leaves the step.
	const demoSafety = useRef(false);
	// Set once this step has left, or is leaving: a late entitlement never skips for it.
	const settled = useRef(false);
	// A purchase is in flight: nothing may interrupt it, the demo's late verdict included.
	const purchasing = useRef(false);
	// Bought here, if the demo's verdict then leaves the step on support instead.
	const purchased = useRef(false);
	const shown = useRef(false);

	// Entitlement can resolve after the name step read it: step aside the moment it does, and
	// count the screen as shown only for someone it was for. Not from under an open demo (it
	// may be showing crisis support), nor during a purchase, whose ending decides.
	useEffect(() => {
		if (!isResolved) {
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
	}, [buying, demoOpen, isPlus, isResolved, onExit, posthog]);

	const buy = async () => {
		const pkg = plans[plan].pkg;
		// Xolace+ can land while the demo is open: its "Keep talking" then sells nothing. The
		// ref, not `buying`, guards: two taps in one frame both see `buying` still false.
		if (!pkg || purchasing.current || isPlus) {
			return;
		}
		purchasing.current = true;
		const trial = startsTrial(plan, plans);
		setBuying(true);
		onStoreCall(true);
		try {
			if (await purchase(pkg, INTAKE_PLUS_SURFACE)) {
				trackPlusPurchased(posthog, plan, trial);
				purchased.current = true;
				settled.current = true;
				// A verdict held through the purchase: support first, and its close leaves.
				if (demoSafety.current) {
					setDemoOpen(true);
				} else {
					onExit("purchased");
				}
			}
		} finally {
			purchasing.current = false;
			setBuying(false);
			onStoreCall(false);
			// Cancelled or failed: the step stays, so a verdict held through it shows now.
			if (demoSafety.current && !settled.current) {
				setDemoOpen(true);
			}
		}
	};

	const restore = async () => {
		if (restoring || buying) {
			return;
		}
		setRestoring(true);
		onStoreCall(true);
		try {
			// Xolace+ coming back resolves the entitlement, and the effect above steps aside.
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
			// Not during the save: this screen's exits are dead by then, so a purchase from the
			// demo would go unrecorded, and the save's landing would leave from under it.
			tryTalk: busy
				? undefined
				: () => {
						trackTalkDemoOpened(posthog);
						setDemoOpen(true);
					},
		},
		demo: {
			label: keepTalkingLabel(plan, plans),
			// Back on the step; after crisis support, on past it (nothing on the safety path is
			// about Xolace+, #704).
			onClose: () => {
				setDemoOpen(false);
				if (demoSafety.current) {
					settled.current = true;
					onSafetyExit(purchased.current ? "purchased" : undefined);
				}
			},
			// Back on the step with the plan it names, its purchase sheet already up.
			onKeepTalking: () => {
				setDemoOpen(false);
				void buy();
			},
			onSafety: () => {
				demoSafety.current = true;
				// Closed while Flux was thinking: bring support back. Not once this step has
				// moved on, or over a purchase, whose end shows it.
				if (!(settled.current || purchasing.current)) {
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
