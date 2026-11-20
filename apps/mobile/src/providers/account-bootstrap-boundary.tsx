import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

import { LaunchHold } from "@/features/launch/launch-hold";
import { isBootstrapError } from "./bootstrap-error";
import { attemptsFor, MAX_RETRIES, RETRY_DELAY_MS } from "./bootstrap-retry";

function BootstrapFallback({ error }: FallbackProps) {
	if (!isBootstrapError(error)) {
		throw error;
	}
	return <LaunchHold reason="bootstrap" />;
}

export function AccountBootstrapBoundary({
	children,
}: {
	children: ReactNode;
}) {
	const { signOut, sessionId } = useAuth();
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [budget, setBudget] = useState({ attempt: 0, session: sessionId });
	const attempt = attemptsFor(budget, sessionId);

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
			return;
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
			resetKeys={[attempt, sessionId]}
		>
			{children}
		</ErrorBoundary>
	);
}
