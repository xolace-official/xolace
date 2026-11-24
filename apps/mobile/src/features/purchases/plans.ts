import type { PurchasesPackage } from "react-native-purchases";
import { introOfferOf } from "@/features/purchases/intro-offer";
import { hasFreeTrial } from "@/features/purchases/screens/paywall-cta-label";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";

type PlanOffer = { eligible: boolean; pkg: PurchasesPackage | null };

export type Plans = Record<PlanId, PlanOffer>;

/** Never names the trial or a discount: App Review 3.1.2(c) rejects a purchase flow that sells
 * the offer louder than the billed amount. */
export const PLAN_CTA = "Continue with Plus";
/** Auto-renewal said where the price is (App Review 3.1.2), as the paywall's CTA says it. */
const CANCEL = "Renews automatically. Cancel any time.";

const introOf = ({ eligible, pkg }: PlanOffer) =>
	introOfferOf(pkg?.product, eligible);

export const defaultPlan = (plans: Plans): PlanId =>
	!plans.annual.pkg && plans.monthly.pkg ? "monthly" : "annual";

export const startsTrial = (plan: PlanId, plans: Plans) =>
	plan === "annual" && hasFreeTrial(plans.annual.pkg, plans.annual.eligible);

const discountOn = (plan: PlanId, plans: Plans) =>
	plan === "monthly" ? introOf(plans.monthly) : null;

/** What it costs, under the button. Leads with the billed amount; a trial or discount comes
 * after it (App Review 3.1.2(c)). */
export function planPriceLine(plan: PlanId, plans: Plans): string | null {
	const pkg = plans[plan].pkg;
	if (!pkg) {
		return null;
	}
	const price = pkg.product.priceString;
	if (startsTrial(plan, plans)) {
		return `${price} a year after a 7-day free trial. ${CANCEL}`;
	}
	const intro = discountOn(plan, plans);
	if (intro) {
		return `${price} a month after ${intro.price}/mo for your first ${intro.term}. ${CANCEL}`;
	}
	const per = plan === "annual" ? "year" : "month";
	return `${price} a ${per}. ${CANCEL}`;
}

/** The billed amount: the price that renews, never the trial or intro price. It is the most
 * conspicuous price on a plan (App Review 3.1.2(c)). */
export function planPrice(plan: PlanId, plans: Plans): string | null {
	const product = plans[plan].pkg?.product;
	if (!product) {
		return null;
	}
	return `${product.priceString}/${plan === "annual" ? "yr" : "mo"}`;
}

/** Everything else about a plan's price, shown smaller and under the billed amount: the free
 * week, the intro discount, the per-month working-out. */
export function planNote(plan: PlanId, plans: Plans): string | null {
	const product = plans[plan].pkg?.product;
	if (!product) {
		return null;
	}
	const intro = discountOn(plan, plans);
	if (intro) {
		return `${intro.price}/mo for ${intro.term}`;
	}
	const perMonth =
		plan === "annual" && product.pricePerMonthString
			? `${product.pricePerMonthString}/mo`
			: null;
	const trial = startsTrial(plan, plans) ? "7 days free" : null;
	const parts = [trial, perMonth].filter(Boolean);
	return parts.length > 0 ? parts.join(" · ") : null;
}
