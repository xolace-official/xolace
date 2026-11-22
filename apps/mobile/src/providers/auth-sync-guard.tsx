import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { requestConvexReauth } from "./use-resilient-clerk-auth";

const DESYNC_GRACE_MS = 4000;

const MAX_REAUTH_ATTEMPTS = 2;

export function desyncRecovery(probe: {
	token: string | null;
	threw: boolean;
	attempt: number;
}): { action: "reauth" | "signout"; reason: string } {
	if (probe.token && probe.attempt < MAX_REAUTH_ATTEMPTS) {
		return {
			action: "reauth",
			reason: `Auth desync — token mintable past grace; forcing Convex re-auth (attempt ${probe.attempt + 1}/${MAX_REAUTH_ATTEMPTS})`,
		};
	}
	if (probe.token) {
		return {
			action: "signout",
			reason: `Auth desync — still desynced after ${MAX_REAUTH_ATTEMPTS} forced re-auths; signing out`,
		};
	}
	return {
		action: "signout",
		reason: probe.threw
			? "Auth desync — getToken threw past grace; signing out"
			: "Auth desync — token unmintable past grace; signing out",
	};
}

export function AuthSyncGuard() {
	const { isSignedIn, getToken, signOut } = useAuth();
	const { isAuthenticated, isLoading } = useConvexAuth();

	const getTokenRef = useRef(getToken);
	const signOutRef = useRef(signOut);
	useEffect(() => {
		getTokenRef.current = getToken;
		signOutRef.current = signOut;
	}, [getToken, signOut]);

	const attemptRef = useRef(0);
	const [reauthTick, setReauthTick] = useState(0);

	useEffect(() => {
		if (!isSignedIn || isAuthenticated) {
			attemptRef.current = 0;
			return;
		}
		if (isLoading) {
			return;
		}

		const timer = setTimeout(async () => {
			let token: string | null = null;
			let threw = false;
			try {
				token = await getTokenRef.current();
			} catch {
				threw = true;
			}

			const { action, reason } = desyncRecovery({
				attempt: attemptRef.current,
				threw,
				token,
			});
			if (action === "reauth") {
				Sentry.captureMessage(reason, "warning");
				requestConvexReauth();
				attemptRef.current += 1;
				setReauthTick((t) => t + 1);
				return;
			}
			Sentry.captureMessage(reason, "error");
			signOutRef.current().catch(() => {});
		}, DESYNC_GRACE_MS);

		return () => clearTimeout(timer);
	}, [isLoading, isSignedIn, isAuthenticated, reauthTick]);

	return null;
}
