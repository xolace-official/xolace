import type { PurchasesPackage } from "react-native-purchases";
import type { PlanId } from "./paywall-period-picker";

const SEVEN_DAYS = ["P1W", "P7D"];

/**
 * The one place in the whole Plus surface area where a trial claim may appear
 * (#221 §6/§7). The constraint is term, not platform: annual carries the free
 * week on both stores, monthly carries it on neither — but the claim is still
 * read off the actual product, so a store that stops offering it stops us
 * saying it.
 *
 * `introPrice` is the App Store path; `defaultOption.freePhase` is Google Play,
 * where the trial is a base-plan offer rather than an intro price. Either way the
 * offer's own period has to be seven days — the copy says "week", so a store
 * configured for three days or a month must not light the claim up.
 *
 * ponytail: this reads the product's offer, not *this user's* eligibility for
 * it — a lapsed subscriber who already spent their free week still sees the
 * claim. Swap in RevenueCat's `checkTrialOrIntroductoryPriceEligibility` (async,
 * so the label needs a loading state) once resubscribes are a real cohort.
 */
export function hasFreeTrial(pkg: PurchasesPackage | null): boolean {
  const product = pkg?.product;
  if (!product) return false;
  const period =
    product.introPrice?.price === 0
      ? product.introPrice.period
      : (product.defaultOption?.freePhase?.billingPeriod?.iso8601 ?? null);
  return period != null && SEVEN_DAYS.includes(period.toUpperCase());
}

export function paywallCtaLabel(selected: PlanId, pkg: PurchasesPackage | null): string {
  return selected === "annual" && hasFreeTrial(pkg)
    ? "Start your free week"
    : "Continue with Plus";
}
