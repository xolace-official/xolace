import { describe, expect, it } from "vitest";
import type { PurchasesPackage } from "react-native-purchases";
import { paywallCtaLabel } from "./paywall-cta-label";

const pkg = (product: Record<string, unknown>) =>
  ({ product }) as unknown as PurchasesPackage;

const appStoreTrial = pkg({ introPrice: { price: 0, period: "P1W" } });
const playTrial = pkg({
  introPrice: null,
  defaultOption: { freePhase: { billingPeriod: { iso8601: "P7D" } } },
});
const shortTrial = pkg({ introPrice: { price: 0, period: "P3D" } });
const noTrial = pkg({ introPrice: null, defaultOption: { freePhase: null } });

describe("paywallCtaLabel", () => {
  it("claims the free week only for an annual package that carries one", () => {
    expect(paywallCtaLabel("annual", appStoreTrial)).toBe("Start your free week");
    expect(paywallCtaLabel("annual", playTrial)).toBe("Start your free week");
  });

  it("never claims a week for an offer that is not seven days", () => {
    expect(paywallCtaLabel("annual", shortTrial)).toBe("Continue with Plus");
  });

  it("never claims a trial on monthly, even if the product carries one", () => {
    expect(paywallCtaLabel("monthly", appStoreTrial)).toBe("Continue with Plus");
  });

  it("falls back to the plain label without a trial or without a package", () => {
    expect(paywallCtaLabel("annual", noTrial)).toBe("Continue with Plus");
    expect(paywallCtaLabel("annual", null)).toBe("Continue with Plus");
  });
});
