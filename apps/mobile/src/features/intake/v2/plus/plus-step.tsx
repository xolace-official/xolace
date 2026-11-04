// `plus` (#713, README § I): "Same week, two ways". Xolace+ once, after the name: three
// moments of one rough week, Free or With Plus. Buying or "Continue free" finishes the
// intake; never shown on the safety path or to someone who has Xolace+ (the machine's rule).
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	INTAKE_PLUS_SURFACE,
	trackPlusContinuedFree,
	trackPlusPlanPicked,
	trackPlusPurchased,
	trackPlusShown,
	trackPlusSwitched,
} from "@/features/intake/analytics";
import { Flux } from "@/features/intake/v2/flux";
import type { PlusOutcome, PlusSide } from "@/features/intake/v2/machine";
import { MomentCards } from "@/features/intake/v2/plus/moment-cards";
import { defaultPlan, startsTrial } from "@/features/intake/v2/plus/plans";
import { PlusFooter } from "@/features/intake/v2/plus/plus-footer";
import { PlusSwitch } from "@/features/intake/v2/plus/plus-switch";
import { usePlusPlans } from "@/features/intake/v2/plus/use-plus-plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";

const FLUX_SIZE = 80;

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

	const buy = async () => {
		const pkg = plans[plan].pkg;
		if (!pkg || buying) {
			return;
		}
		settled.current = true;
		const trial = startsTrial(plan, plans);
		setBuying(true);
		try {
			if (await purchase(pkg, INTAKE_PLUS_SURFACE)) {
				trackPlusPurchased(posthog, plan, trial);
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
		<View className="flex-1">
			<View className="flex-row items-center justify-between gap-3 px-5 pt-4">
				<View className="flex-1 gap-1.5">
					<View className="self-start rounded-full bg-ember/15 px-2.5 py-1">
						<AppText className="font-[Poppins-SemiBold] text-[12px] text-ember">
							Xolace+
						</AppText>
					</View>
					<AppText
						accessibilityRole="header"
						className="font-[Poppins-SemiBold] text-[24px] text-foreground leading-[28px]"
					>
						{"Same rough week.\nTwo ways it goes."}
					</AppText>
				</View>
				{/* Grey and resting on Free, in full colour and happy on Plus. */}
				<Flux
					mood={side === "plus" ? "happy" : "idle"}
					palette={side === "plus" ? undefined : "muted"}
					size={FLUX_SIZE}
				/>
			</View>

			<PlusSwitch onChange={switchTo} side={side} />

			<ScrollView
				className="mt-3.5 flex-1"
				contentContainerClassName="px-5 pb-2"
				showsVerticalScrollIndicator={false}
			>
				<MomentCards side={side} />
			</ScrollView>

			<PlusFooter
				busy={busy}
				buying={buying}
				onBuy={buy}
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
				onSeePlus={() => switchTo("plus")}
				owned={isPlus}
				plan={plan}
				plans={plans}
				retrying={retrying || isLoading}
				side={side}
				unavailable={unavailable}
			/>
		</View>
	);
}
