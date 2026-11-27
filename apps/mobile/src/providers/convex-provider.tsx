"use client";

import "@/lib/clerk-online-polyfill";

import { ClerkProvider } from "@clerk/expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { type ReactNode, useState } from "react";
import { ConnectionProvider } from "@/lib/connection/connection-provider";
import { instrumentedTokenCache } from "@/lib/instrumented-token-cache";
import { AccountBootstrapBoundary } from "./account-bootstrap-boundary";
import { AuthSyncGuard } from "./auth-sync-guard";
import { ClerkLoadRetry } from "./clerk-load-retry";
import { useResilientClerkAuth } from "./use-resilient-clerk-auth";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	// Each retry of a failed Clerk load is a fresh ClerkProvider (see ClerkLoadRetry).
	const [clerkRetries, setClerkRetries] = useState(0);
	const retryClerk = () => setClerkRetries((n) => n + 1);
	return (
		<ConnectionProvider convex={convex}>
			<ClerkProvider
				__experimental_disableNativeClientSync
				key={clerkRetries}
				publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
				tokenCache={instrumentedTokenCache}
			>
				<ClerkLoadRetry onRetry={retryClerk} retries={clerkRetries} />
				<ConvexProviderWithClerk
					client={convex}
					useAuth={useResilientClerkAuth}
				>
					<AuthSyncGuard />
					<AccountBootstrapBoundary>{children}</AccountBootstrapBoundary>
				</ConvexProviderWithClerk>
			</ClerkProvider>
		</ConnectionProvider>
	);
}
