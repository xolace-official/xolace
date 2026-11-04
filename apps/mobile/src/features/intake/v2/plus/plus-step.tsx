// `plus` (#713, README § I): "Same week, two ways". Xolace+ once, after the name: three
// moments of one rough week, Free or With Plus. Buying or "Continue free" finishes the
// intake; never shown on the safety path or to someone who has Xolace+ (the machine's rule).
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import {
	INTAKE_PLUS_SURFACE,
	trackPlusContinuedFree,
	trackPlusPlanPicked,
	trackPlusPurchased,
	trackPlusShown,
	trackPlusSwitched,
	trackTalkDemoOpened,
} from "@/features/intake/analytics";
import type { PlusOutcome, PlusSide } from "@/features/intake/v2/machine";
import {
	defaultPlan,
	keepTalkingLabel,
	startsTrial,
} from "@/features/intake/v2/plus/plans";
import { PlusStepView } from "@/features/intake/v2/plus/plus-step-view";
import { TalkDemo } from "@/features/intake/v2/plus/talk-demo/talk-demo";
import { usePlusPlans } from "@/features/intake/v2/plus/use-plus-plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";

type Props = {
	/** The intake is being saved after this step. */
	busy: boolean;
	onExit: (outcome: PlusOutcome) => void;
};

export function PlusStep({ busy, onExit }: Props) {
	const posthog = usePostHog();
	const { isPlus, isResolved } = usePlusEntitlement();
	const { isLoading, plans, purchase, refreshOfferings, unavailable } =
		usePlusPlans();
	const [side, setSide] = useState<PlusSide>("free");
	const [picked, setPicked] = useState<PlanId | null>(null);
	const [buying, setBuying] = useState(false);
	const [retrying, setRetrying] = useState(false);
	const [demoOpen, setDemoOpen] = useState(false);
	// The demo's safeguard tripped: its close leaves the step.
	const demoSafety = useRef(false);
	// Until the store answers, the default follows what it sells; a tap pins it.
	const plan = picked ?? defaultPlan(plans);
	// Set once this step has acted on Xolace+: a late entitlement then never skips for it.
	const settled = useRef(false);
	const shown = useRef(false);

	// Entitlement can resolve after the name step read it: step aside the moment it does, and
	// count the screen as shown only for someone it was really for.
	useEffect(() => {
		if (!isResolved) {
			return;
		}
		if (isPlus && !settled.current) {
			settled.current = true;
			onExit("entitled");
			return;
		}
		if (!(isPlus || shown.current)) {
			shown.current = true;
			trackPlusShown(posthog);
		}
	}, [isPlus, isResolved, onExit, posthog]);

	const switchTo = (next: PlusSide) => {
		if (next === side) {
			return;
		}
		playSoftPress();
		trackPlusSwitched(posthog, next);
		setSide(next);
	};

	const buy = async (chosen: PlanId) => {
		const pkg = plans[chosen].pkg;
		if (!pkg || buying) {
			return;
		}
		settled.current = true;
		const trial = startsTrial(chosen, plans);
		setBuying(true);
		try {
			if (await purchase(pkg, INTAKE_PLUS_SURFACE)) {
				trackPlusPurchased(posthog, chosen, trial);
				onExit("purchased");
			}
		} finally {
			setBuying(false);
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

	return (
		<>
			<PlusStepView
				busy={busy}
				buying={buying}
				onBuy={() => buy(plan)}
				onContinueFree={() => {
					settled.current = true;
					trackPlusContinuedFree(posthog, side);
					onExit("dismissed");
				}}
				onPick={(next) => {
					if (next !== plan) {
						playSoftPress();
						trackPlusPlanPicked(posthog, next);
					}
					setPicked(next);
				}}
				onRetry={retry}
				onSide={switchTo}
				onTryTalk={() => {
					trackTalkDemoOpened(posthog);
					setDemoOpen(true);
				}}
				owned={isPlus}
				plan={plan}
				plans={plans}
				retrying={retrying || isLoading}
				side={side}
				unavailable={unavailable}
			/>
			<TalkDemo
				keepTalkingLabel={keepTalkingLabel(plan, plans)}
				// Back on the step; after crisis support, on past it to Xolace (nothing on the
				// safety path is about Xolace+, #704).
				onClose={() => {
					setDemoOpen(false);
					if (demoSafety.current) {
						settled.current = true;
						onExit("dismissed");
					}
				}}
				// Back on the step with the plan it names, its purchase sheet already up.
				onKeepTalking={() => {
					setDemoOpen(false);
					setSide("plus");
					void buy(plan);
				}}
				onSafety={() => {
					demoSafety.current = true;
					// Closed while Flux was thinking: bring support back, it opens on the server's
					// word. Not once this step has moved on, or over a purchase.
					if (!settled.current) {
						setDemoOpen(true);
					}
				}}
				visible={demoOpen}
			/>
		</>
	);
}
