import { useRef } from "react";
import { useAuth } from "@clerk/expo";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePreferenceMutation } from "./use-preference-mutation";
import { clearReflectDraft } from "@/src/features/reflect/reflect-draft";

export type RetentionOption = "indefinite" | "6_months" | "1_year";

export const useDataSettings = () => {
  const preferences = useQuery(api.preferences.get);
  const updatePreferences = usePreferenceMutation();
  const requestDataWipe = useMutation(api.users.requestDataWipe);
  const requestDeletion = useMutation(api.users.requestDeletion);
  const { signOut } = useAuth();
  const deletionRequested = useRef(false);

  const contributeAnonymously = preferences?.contributeByDefault ?? false;
  // On by default (undefined = true) — see Cognition Layer §1.1b.
  const personalMemory = preferences?.personalMemoryEnabled !== false;
  const retention: RetentionOption = preferences?.dataRetentionPreference ?? "indefinite";

  const retentionDisplay =
    retention === "indefinite"
      ? "Indefinite"
      : retention === "6_months"
        ? "6 months"
        : "1 year";

  const setContributeAnonymously = (v: boolean) => {
    updatePreferences({ contributeByDefault: v });
  };

  const setPersonalMemory = (v: boolean) => {
    updatePreferences({ personalMemoryEnabled: v });
  };

  const setRetention = (value: RetentionOption) => {
    updatePreferences({ dataRetentionPreference: value });
  };

  const performDeleteData = async () => {
    await requestDataWipe();
    clearReflectDraft();
  };

  const performDeleteAccount = async () => {
    // Deletion already landed on a previous attempt that failed at sign-out —
    // re-running it would only throw account_inactive from requireAuth.
    if (!deletionRequested.current) {
      await requestDeletion();
      deletionRequested.current = true;
    }
    // The patch invalidates every requireAuth-gated subscription immediately,
    // so the session has to go or they all re-run against a dead row. Let a
    // failure propagate so the confirm dialog surfaces its danger toast.
    await signOut();
  };

  return {
    contributeAnonymously,
    setContributeAnonymously,
    personalMemory,
    setPersonalMemory,
    retention,
    retentionDisplay,
    setRetention,
    performDeleteData,
    performDeleteAccount,
  };
};
