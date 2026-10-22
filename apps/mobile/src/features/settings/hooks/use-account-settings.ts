import { useMutation, useQuery } from "convex/react";
import { useClerk, useUser } from "@clerk/expo";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import { getGrantedPushToken } from "@/src/lib/push-token";
import { usePreferenceMutation } from "./use-preference-mutation";

/** How long sign-out will wait on the push-token detach before going ahead. */
const PUSH_DETACH_TIMEOUT_MS = 2500;

export const useAccountSettings = () => {
  const preferences = useQuery(api.preferences.get);
  const profileSummary = useQuery(api.profile.getSummary);
  const updatePreferences = usePreferenceMutation();
  const updateDisplayName = useMutation(api.profile.updateDisplayName);
  const removeToken = useMutation(api.notifications.removeToken);
  const { signOut } = useClerk();
  const { user } = useUser();
  const posthog = usePostHog();

  const signInMethod = (() => {
    if (!user) return "—";
    for (const ext of user.externalAccounts ?? []) {
      const provider = (ext.provider ?? "").toLowerCase();
      if (provider.includes("apple")) return "Apple";
      if (provider.includes("google")) return "Google";
    }
    return "Email";
  })();

  const spaceName = preferences?.spaceName;

  const setSpaceName = async (next: string | null) => {
    await updatePreferences({ spaceName: next });
  };

  // Read from getSummary, not preferences: it fills in the seeded fallback for
  // profiles created before displayName existed, so the row and the profile
  // screen always show the same name.
  const displayName = profileSummary?.displayName;

  const setDisplayName = async (next: string) => {
    await updateDisplayName({ displayName: next });
  };

  const performLogout = async () => {
    posthog.capture("user_signed_out");
    posthog.reset();

    // Detach this installation before the session goes, so notification
    // content can't follow the account off the device. Awaited, because
    // fire-and-forget lost the race: `getGrantedPushToken` is an OS + Expo
    // round-trip, so `signOut` cleared Convex auth first and the mutation died
    // unauthenticated. Bounded, because sign-out must never hang on it — this
    // is only the belt; registration on the next account is what actually
    // enforces single ownership.
    await Promise.race([
      getGrantedPushToken()
        .then((token) => token && removeToken({ pushToken: token }))
        .catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, PUSH_DETACH_TIMEOUT_MS)),
    ]);

    try {
      await signOut();
    } catch {
      // Clerk updates its own auth state; ignore network errors
    }
  };

  return {
    signInMethod,
    spaceName,
    setSpaceName,
    displayName,
    setDisplayName,
    performLogout,
  };
};
