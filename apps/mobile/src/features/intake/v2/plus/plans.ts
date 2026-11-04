// The Xolace+ step's plans (#713), read off RevenueCat's current offering and nothing else:
// a seasonal or loyalty discount arrives as that offering's intro price, like any other.
import type { PurchasesPackage } from "react-native-purchases";
import { hasFreeTrial } from "@/features/purchases/screens/paywall-cta-label";
import { introOfferOf } from "@/features/purchases/screens/paywall-intro-offer";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";

/** A store plan and whether this user can still take its intro offer. */
type PlanOffer = { eligible: boolean; pkg: PurchasesPackage | null };

export type Plans = Record<PlanId, PlanOffer>;

const PLAIN_CTA = "Continue with Plus";
const CANCEL = "Cancel any time.";

const introOf = ({ eligible, pkg }: PlanOffer) =>
	introOfferOf(pkg?.product, eligible);

/** Yearly and its free week, unless the store sells only monthly. */
export const defaultPlan = (plans: Plans): PlanId =>
	!plans.annual.pkg && plans.monthly.pkg ? "monthly" : "annual";

/** The week only on yearly (#221 §6), the discount only on monthly, as the paywall does.
 * Also what `intake_plus_trial_started` hangs on. */
export const startsTrial = (plan: PlanId, plans: Plans) =>
	plan === "annual" && hasFreeTrial(plans.annual.pkg, plans.annual.eligible);

const discountOn = (plan: PlanId, plans: Plans) =>
	plan === "monthly" ? introOf(plans.monthly) : null;

export function planCta(plan: PlanId, plans: Plans): string {
	if (startsTrial(plan, plans)) {
		return "Start my free week";
	}
	const intro = discountOn(plan, plans);
	return intro
		? `Get ${intro.percentOff}% off your first ${intro.term}`
		: PLAIN_CTA;
}

/** What it costs, under the button. A discount says what it renews at (Apple rejects a
 * paywall that hides it). */
export function planPriceLine(plan: PlanId, plans: Plans): string | null {
	const pkg = plans[plan].pkg;
	if (!pkg) {
		return null;
	}
	if (startsTrial(plan, plans)) {
		return `Then ${pkg.product.priceString} a year. ${CANCEL}`;
	}
	const intro = discountOn(plan, plans);
	if (intro) {
		return `${intro.price}/mo for your first ${intro.term}, then ${intro.fullPrice}/mo. ${CANCEL}`;
	}
	const per = plan === "annual" ? "year" : "month";
	return `${pkg.product.priceString} a ${per}. ${CANCEL}`;
}

/** The small mark on a plan's option: its free week or its discount. */
export function planTag(plan: PlanId, plans: Plans): string | null {
	if (startsTrial(plan, plans)) {
		return "7 days free";
	}
	const intro = discountOn(plan, plans);
	return intro ? `${intro.percentOff}% off` : null;
}

/** The Talk demo's way on (#714): it buys the plan picked on the step, so it names that
 * plan's week or discount, and only when the store will give it. */
export const keepTalkingLabel = (plan: PlanId, plans: Plans): string => {
	const tag = planTag(plan, plans);
	return tag ? `Keep talking · ${tag}` : "Keep talking";
};
