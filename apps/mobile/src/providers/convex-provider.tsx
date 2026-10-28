"use client";

// Forces navigator.onLine=true before @clerk/expo is imported (module side effects run in
// import order).
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

/** Clerk and Convex providers for the app, with the instrumented token cache and resilient
 * `useAuth`. */
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
				{/* Catches premium.getEntitlement's crash from RevenueCatProvider, which sits
				    above the route guard. */}
				<AccountBootstrapBoundary>{children}</AccountBootstrapBoundary>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
