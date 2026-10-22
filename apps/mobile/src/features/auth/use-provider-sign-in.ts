/**
 * The Clerk sign-in flow behind the two provider buttons, lifted verbatim out
 * of the retired `AuthScreen` when the carousel-to-auth screen took over as
 * the only sign-in surface (#204). Behaviour is deliberately unchanged: the
 * stale-session guard, the cancelled-flow short-circuits, the PostHog capture
 * and the error serialization are all the shipped, tested logic.
 *
 * `useCallback` here is not memoization (the React Compiler handles that) —
 * the compiler skips functions with `try/finally` bodies, and these have one.
 */
import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { useSignInWithGoogle } from '@clerk/expo/google';
import { useSignInWithApple } from '@clerk/expo/apple';
import { useMutation } from 'convex/react';
import { useToast } from 'heroui-native';
import { usePostHog } from 'posthog-react-native';

import { api } from '@/convex/_generated/api';
import { playSoftPress } from '@/src/lib/haptics';

export type AuthProvider = 'apple' | 'google';

/**
 * What we can safely say about an unknown throw, for the exception capture.
 * Only these fields — a thrown SDK error can carry the whole response body,
 * the request payload, or a token, and this string ships to PostHog.
 */
const SAFE_ERROR_KEYS = ['name', 'message', 'code', 'status', 'statusText'] as const;

const describeError = (error: unknown) => {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const described = SAFE_ERROR_KEYS.filter((k) => record[k] !== undefined).map(
      (k) => `${k}: ${String(record[k])}`,
    );
    return described.length > 0
      ? described.join('\n')
      : `Unrecognized error object. Proto: ${Object.getPrototypeOf(error)?.constructor?.name ?? 'none'}`;
  }
  return String(error);
};

const errorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error
    ? (error as { code: string | number }).code
    : undefined;

/**
 * Backing out of the native sheet is not a failure. The provider SDKs report
 * it with a code, but Clerk's web-based fallback (what the simulator and any
 * device without the Google app take) throws a plain Error with no code at
 * all — which is why a cancel used to surface a red error toast and land in
 * PostHog as an exception.
 */
const isCancellation = (error: unknown) => {
  const code = errorCode(error);
  if (code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED' || code === -5) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('cancel') || message.includes('dismiss');
};

export const useProviderSignIn = () => {
  const { isSignedIn, signOut } = useAuth();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const posthog = usePostHog();
  const { toast } = useToast();

  const signInWithApple = useCallback(async () => {
    playSoftPress();

    try {
      setLoadingProvider('apple');

      // A stale Clerk session (active client-side but never validated by
      // Convex) makes the SSO flow throw "You're already signed in" and
      // dead-ends the user here. Clear it first so a fresh sign-in proceeds.
      if (isSignedIn) {
        await signOut();
      }

      const { createdSessionId, setActive, signUp } = await startAppleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        await getOrCreate({
          authProvider: 'apple',
          authProviderAccountId: signUp?.createdUserId ?? 'apple-user',
        });

        // Identify happens on app open against the emotional profile id
        // (usePostHogIdentity), not here — this event lands on the anonymous
        // id and is merged by that identify call.
        posthog.capture('user_signed_in', {
          auth_provider: 'apple',
          is_new_user: !!signUp?.createdUserId,
        });
      }
    } catch (error: unknown) {
      if (isCancellation(error)) return;

      const msg = describeError(error);
      console.error('Apple auth error:', msg);
      posthog.capture('$exception', {
        $exception_list: [{ type: 'AppleAuthError', value: msg }],
        auth_provider: 'apple',
      });
      toast.show({
        label: "Couldn't sign in with Apple",
        description: 'Something went wrong. Try again.',
        variant: 'default',
      });
    } finally {
      setLoadingProvider(null);
    }
  }, [startAppleAuthenticationFlow, getOrCreate, posthog, isSignedIn, signOut, toast]);

  const signInWithGoogle = useCallback(async () => {
    playSoftPress();

    try {
      setLoadingProvider('google');

      // See the Apple branch: clear a stale session before a fresh attempt.
      if (isSignedIn) {
        await signOut();
      }

      const { createdSessionId, setActive, signUp } = await startGoogleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });

        await getOrCreate({
          authProvider: 'google',
          authProviderAccountId: signUp?.createdUserId ?? 'google-user',
        });

        posthog.capture('user_signed_in', {
          auth_provider: 'google',
          is_new_user: !!signUp?.createdUserId,
        });
      } else {
        console.warn('[GoogleAuth] no session created — createdSessionId:', createdSessionId);
      }
    } catch (error: unknown) {
      if (isCancellation(error)) {
        console.log('[GoogleAuth] cancelled by user, code:', errorCode(error));
        return;
      }

      const msg = describeError(error);
      console.error('Google auth error:', msg);
      posthog.capture('$exception', {
        $exception_list: [{ type: 'GoogleAuthError', value: msg }],
        auth_provider: 'google',
      });
      toast.show({
        label: "Couldn't sign in with Google",
        description: 'Something went wrong. Try again.',
        variant: 'default',
      });
    } finally {
      setLoadingProvider(null);
    }
  }, [startGoogleAuthenticationFlow, getOrCreate, posthog, isSignedIn, signOut, toast]);

  return { loadingProvider, signInWithApple, signInWithGoogle };
};
