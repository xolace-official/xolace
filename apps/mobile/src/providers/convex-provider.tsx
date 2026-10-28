"use client";

// Force navigator.onLine=true so Clerk's offline gate doesn't block JWT minting
// in React Native. Must run before @clerk/expo is imported below, since module
// side effects execute in import order. Primary install is the first import in
// app/_layout.tsx; this keeps the provider correct if it is ever loaded
// independently. See module doc.
import "@/lib/clerk-online-polyfill";

import { ClerkProvider } from "@clerk/expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { instrumentedTokenCache } from "@/lib/instrumented-token-cache";
import { AccountBootstrapBoundary } from "./account-bootstrap-boundary";
import { AuthSyncGuard } from "./auth-sync-guard";
import { useResilientClerkAuth } from "./use-resilient-clerk-auth";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

/**
 * Provides Clerk and Convex contexts configured for the app, injecting Clerk's publishable key and token cache and passing the `useAuth` hook to Convex.
 *
 * @unmemoized
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<ClerkProvider
			// No Clerk native UI in this app (hooks only), so native<->JS client
			// sync buys nothing and is the subsystem behind the random logouts.
			__experimental_disableNativeClientSync
			publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
			tokenCache={instrumentedTokenCache}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useResilientClerkAuth}>
				<AuthSyncGuard />
				{/* Wraps everything below Convex — the crash it catches came from
            RevenueCatProvider's premium.getEntitlement, which lives above the
            route guard and so is unreachable by any boundary inside a group. */}
				<AccountBootstrapBoundary>{children}</AccountBootstrapBoundary>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
