import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

import { LaunchHold } from "@/features/launch/launch-hold";
import { isBootstrapError } from "./bootstrap-error";
import { attemptsFor, MAX_RETRIES, RETRY_DELAY_MS } from "./bootstrap-retry";

/** While the row settles: the launch cover holds at launch, a quiet loading state after it.
 * Non-bootstrap errors are rethrown so the root ErrorBoundary reports them. */
function BootstrapFallback({ error }: FallbackProps) {
	if (!isBootstrapError(error)) {
		throw error;
	}
	return <LaunchHold reason="bootstrap" />;
}

/** Holds (or a quiet loading state) and remounts while Convex is authenticated but the user row isn't usable yet (sign-in,
 * deletion); signs out if it never settles. */
export function AccountBootstrapBoundary({
	children,
}: {
	children: ReactNode;
}) {
	const { signOut, sessionId } = useAuth();
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Tagged with the session id — not `isSignedIn`, which returns to `true` on
	// the next sign-in and would hand a fresh session the old one's spent budget.
	// Derived, so no effect has to sync it.
	const [budget, setBudget] = useState({ attempt: 0, session: sessionId });
	const attempt = attemptsFor(budget, sessionId);

	// Also runs when the session changes, dropping a retry queued by the session
	// that just ended.
	useEffect(
		() => () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
		},
		[sessionId]
	);

	const handleError = (error: unknown) => {
		if (!isBootstrapError(error)) {
			return; // rethrown by the fallback below
		}
		if (attempt >= MAX_RETRIES) {
			Sentry.captureMessage(
				"Account bootstrap never settled — signing out",
				"error"
			);
			void signOut().catch(() => {});
			return;
		}
		timer.current = setTimeout(
			() => setBudget({ attempt: attempt + 1, session: sessionId }),
			RETRY_DELAY_MS
		);
	};

	return (
		<ErrorBoundary
			FallbackComponent={BootstrapFallback}
			onError={handleError}
			// A landed sign-out is itself a resolution: the queries stop being
			// issued, so remount rather than sitting on the loader.
			resetKeys={[attempt, sessionId]}
		>
			{children}
		</ErrorBoundary>
	);
}
