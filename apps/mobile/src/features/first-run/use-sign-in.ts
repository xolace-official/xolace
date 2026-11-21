import { useAuth } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import { useSignInWithGoogle } from "@clerk/expo/google";
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";
import { SIGN_IN_ERROR } from "./copy";
import { describeError } from "./sign-in-errors";
import {
	type AuthProvider,
	createSeatHold,
	runSignIn,
	type SeatHold,
	type SignInOutcome,
} from "./sign-in-flow";

export type { AuthProvider, SignInOutcome } from "./sign-in-flow";

const schedule = (run: () => void, ms: number) => {
	const id = setTimeout(run, ms);
	return () => clearTimeout(id);
};

export function useSignIn() {
	const { isSignedIn, signOut } = useAuth();
	const { startAppleAuthenticationFlow } = useSignInWithApple();
	const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
	const getOrCreate = useMutation(api.users.getOrCreate);
	const posthog = usePostHog();
	const setSeatHeld = useAppStore((s) => s.setSeatHeld);
	const setAccountPending = useAppStore((s) => s.setAccountPending);
	const hold = useRef<SeatHold | null>(null);

	useEffect(() => {
		const seat = createSeatHold({ schedule, setAccountPending, setSeatHeld });
		hold.current = seat;
		const sub = AppState.addEventListener("change", seat.appState);
		return () => {
			sub.remove();
			seat.dispose();
		};
	}, [setAccountPending, setSeatHeld]);

	const signIn = (provider: AuthProvider): Promise<SignInOutcome> => {
		const seat = hold.current;
		if (!seat) {
			return Promise.resolve("cancelled");
		}
		playSoftPress();
		return runSignIn(provider, {
			failed: (p, error) => {
				const type = p === "apple" ? "AppleAuthError" : "GoogleAuthError";
				posthog.capture("$exception", {
					$exception_list: [{ type, value: describeError(error) }],
					auth_provider: p,
				});
				Sentry.captureException(error);
				toast(SIGN_IN_ERROR.label(p), {
					description: SIGN_IN_ERROR.description,
				});
			},
			getOrCreate,
			hold: seat,
			isSignedIn: () => !!isSignedIn,
			signedIn: (p, isNewUser) =>
				posthog.capture("user_signed_in", {
					auth_provider: p,
					is_new_user: isNewUser,
				}),
			signOut,
			start: (p) =>
				p === "apple"
					? startAppleAuthenticationFlow()
					: startGoogleAuthenticationFlow(),
		});
	};

	return { release: () => hold.current?.release(), signIn };
}
