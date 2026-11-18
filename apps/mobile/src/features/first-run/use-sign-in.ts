import { useAuth } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import { useSignInWithGoogle } from "@clerk/expo/google";
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";
import { SIGN_IN_ERROR } from "./copy";
import { describeError, isCancellation } from "./sign-in-errors";

export type AuthProvider = "apple" | "google";
export type SignInOutcome = "signed-in" | "cancelled" | "failed";

/** The seat lets go by itself this long after signing in, if its moment never ends. */
const HOLD_AFTER_MS = 8000;

/**
 * Clerk sign-in behind the seat's two buttons (#204). It holds the seat (`seatHeld`) from the tap,
 * so the root gate keeps first run up through the seated moment instead of cutting to intake the
 * instant the session lands; `release()` lets go when the moment ends. A cancel or a failure lets
 * go at once, and so does leaving first run. An account that already finished intake skips the
 * hold: the gate sends it home as soon as it's signed in.
 */
export function useSignIn() {
	const { isSignedIn, signOut } = useAuth();
	const { startAppleAuthenticationFlow } = useSignInWithApple();
	const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
	const getOrCreate = useMutation(api.users.getOrCreate);
	const posthog = usePostHog();
	const setSeatHeld = useAppStore((s) => s.setSeatHeld);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const release = () => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		setSeatHeld(false);
	};

	useEffect(
		() => () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
			setSeatHeld(false);
		},
		[setSeatHeld]
	);

	const signIn = async (provider: AuthProvider): Promise<SignInOutcome> => {
		playSoftPress();
		setSeatHeld(true);
		try {
			// A stale Clerk session (never validated by Convex) makes the SSO flow throw
			// "You're already signed in". Clear it first.
			if (isSignedIn) {
				await signOut();
			}
			const start =
				provider === "apple"
					? startAppleAuthenticationFlow
					: startGoogleAuthenticationFlow;
			const { createdSessionId, setActive, signUp } = await start();
			if (!(createdSessionId && setActive)) {
				setSeatHeld(false);
				return "cancelled";
			}
			await setActive({ session: createdSessionId });
			await getOrCreate({
				authProvider: provider,
				authProviderAccountId: signUp?.createdUserId ?? `${provider}-user`,
			});
			// Lands on the anonymous id; usePostHogIdentity merges it on app open.
			posthog.capture("user_signed_in", {
				auth_provider: provider,
				is_new_user: !!signUp?.createdUserId,
			});
			timer.current = setTimeout(release, HOLD_AFTER_MS);
			return "signed-in";
		} catch (error: unknown) {
			setSeatHeld(false);
			if (isCancellation(error)) {
				return "cancelled";
			}
			const type = provider === "apple" ? "AppleAuthError" : "GoogleAuthError";
			posthog.capture("$exception", {
				$exception_list: [{ type, value: describeError(error) }],
				auth_provider: provider,
			});
			Sentry.captureException(error);
			toast(SIGN_IN_ERROR.label(provider), {
				description: SIGN_IN_ERROR.description,
			});
			return "failed";
		}
	};

	return { release, signIn };
}
