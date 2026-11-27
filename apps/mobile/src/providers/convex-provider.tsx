"use client";

import "@/lib/clerk-online-polyfill";

import { ClerkProvider } from "@clerk/expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { ConnectionProvider } from "@/lib/connection/connection-provider";
import { instrumentedTokenCache } from "@/lib/instrumented-token-cache";
import { AccountBootstrapBoundary } from "./account-bootstrap-boundary";
import { AuthSyncGuard } from "./auth-sync-guard";
import { useResilientClerkAuth } from "./use-resilient-clerk-auth";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<ClerkProvider
			__experimental_disableNativeClientSync
			publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
			tokenCache={instrumentedTokenCache}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useResilientClerkAuth}>
				<ConnectionProvider>
					<AuthSyncGuard />
					<AccountBootstrapBoundary>{children}</AccountBootstrapBoundary>
				</ConnectionProvider>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
