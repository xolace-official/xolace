import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import type { PlanId } from "@/features/purchases/plans";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import {
	type PaywallSurface,
	usePaywall,
} from "@/features/purchases/use-paywall";
import { usePlans } from "@/features/purchases/use-plans";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";

/** Why the paywall is closing; intake's `intake_completed` outcome hangs on it. */
export type PlusExitReason = "purchased" | "dismissed";

export type PlusOptions = {
	surface?: PaywallSurface;
	/** Session to fulfil kindling for via `paths.requestKindling` (docs/paths-v1.md §12). */
	sessionId?: Id<"sessions">;
	/** Where a dismiss or purchase goes. Called at most once per mount; resolve `false` if
	 * swallowed to unlatch the guard. The route close otherwise. */
	onExit?: (reason: PlusExitReason) => void | Promise<boolean>;
};

/**
 * The paywall on RevenueCat, Convex and PostHog: the current offering's plans, buying and
 * restoring (their toasts and `purchase_*` events live in RevenueCat's context), kindling
 * for the session that opened it, and `paywall_opened` / `paywall_dismissed`.
 */
export function usePlus({ surface, sessionId, onExit }: PlusOptions) {
	const posthog = usePostHog();
	const close = usePaywall((s) => s.close);
	const { isLoading, plans, purchase, refreshOfferings, unavailable } =
		usePlans();
	const { restorePurchases } = useRevenueCat();
	const { isPlus } = usePlusEntitlement();
	const requestKindling = useMutation(api.paths.requestKindling);
	const { isAuthenticated } = useConvexAuth();
	const summary = useQuery(
		api.profile.getSummary,
		isAuthenticated ? {} : "skip"
	);
	const sessionCount = summary?.sessionCount ?? null;
	const [buying, setBuying] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [retrying, setRetrying] = useState(false);
	// Single-flight exit: a second `onExit` would persist and track a second intake outcome.
	// The ref guards; two presses in one frame both read stale state.
	const exitingRef = useRef(false);
	const [exiting, setExiting] = useState(false);

	useEffect(() => {
		posthog.capture("paywall_opened", {
			session_count: sessionCount,
			surface: surface ?? null,
		});
		// Once on mount; the session count is attribution detail, not a re-fire trigger.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const exit = (reason: PlusExitReason) => {
		if (exitingRef.current) {
			return;
		}
		exitingRef.current = true;
		setExiting(true);
		Promise.resolve(onExit ? onExit(reason) : close()).then((written) => {
			// Only intake reports back, and only to say the write was swallowed. Unlatch, or
			// Continue free is dead on a screen with no back edge.
			if (written === false) {
				exitingRef.current = false;
				setExiting(false);
			}
		});
	};

	const buy = (plan: PlanId) => {
		const pkg = plans[plan].pkg;
		if (!pkg || buying) {
			return;
		}
		setBuying(true);
		purchase(pkg, surface)
			.then((ok) => {
				if (!ok) {
					return;
				}
				// Best-effort: a failure here costs this one kindling, never the purchase.
				if (sessionId) {
					requestKindling({ sessionId }).catch(Sentry.captureException);
				}
				exit("purchased"); // the server's entitlement query flips reactively
			})
			.finally(() => setBuying(false));
	};

	return {
		actions: {
			buy,
			leave: () => {
				if (!exitingRef.current) {
					posthog.capture("paywall_dismissed", {
						session_count: sessionCount,
						surface: surface ?? null,
					});
				}
				exit("dismissed");
			},
			restore: () => {
				setRestoring(true);
				restorePurchases().finally(() => setRestoring(false));
			},
			retry: () => {
				setRetrying(true);
				refreshOfferings().finally(() => setRetrying(false));
			},
		},
		state: {
			buying,
			exiting,
			owned: isPlus,
			plans,
			restoring,
			retrying: retrying || isLoading,
			unavailable,
		},
	};
}
