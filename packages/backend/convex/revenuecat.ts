import { RevenueCat } from "convex-revenuecat";
import { components, internal } from "./_generated/api";

// =============================================================
// XOLACE — SHARED REVENUECAT INSTANCE
// =============================================================
//
// Single source of truth for the RevenueCat component, mirroring
// the convex/posthog.ts / convex/rag.ts shared-instance pattern.
// The component mirrors RC subscriber state into reactive Convex
// tables via webhooks; every server-side entitlement read goes
// through convex/lib/premium.ts, which calls this instance.
//
// appUserId convention = emotionalProfileId (profile._id). We pass
// it explicitly everywhere, so we deliberately do NOT re-export the
// component's identity-derived api() convenience queries — those
// resolve appUserId from ctx.auth.getUserIdentity() and cannot see
// the profile id. See docs/subscrption/gating-plan.md step 10.
//
// REVENUECAT_WEBHOOK_AUTH must be set in the Convex deployment env
// (min 32 chars). A missing secret rejects all inbound webhooks.
// =============================================================

// Explicit annotation breaks the type-inference cycle: this file references
// internal.premium.*, whose module imports lib/premium.ts, which imports back
// into this instance.
export const revenuecat: RevenueCat = new RevenueCat(components.revenuecat, {
  REVENUECAT_WEBHOOK_AUTH: process.env.REVENUECAT_WEBHOOK_AUTH,
  hooks: {
    onEntitlementActivated: internal.premium.onEntitlementActivated,
    onEntitlementDeactivated: internal.premium.onEntitlementDeactivated,
  },
});
