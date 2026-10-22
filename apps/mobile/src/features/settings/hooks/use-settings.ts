import { useClerk, useUser } from "@clerk/expo";
import { usePostHog } from "posthog-react-native";
import { Uniwind } from "uniwind";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { RetentionOption } from "@/src/features/settings/components/retention-picker-dialog";
import type { MirrorTone } from "@/src/features/settings/components/mirror-tone-picker-dialog";
import { useAppStore } from "@/src/store/store";
import { useAppTheme } from "@/src/context/app-theme-context";

export type ThemeMode = "system" | "light" | "dark";

/**
 * Encapsulates all settings screen state and handlers:
 * — toggle preferences (Zustand persisted + fire-and-forget Convex sync)
 * — theme mode display + switching (Uniwind + Zustand + Convex)
 * — sign-in method (Clerk external accounts)
 * — destructive action handlers (logout, data wipe, account deletion)
 */
export const useSettings = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const posthog = usePostHog();
  const {
    theme: storedTheme,
    setTheme: storeSetTheme,
    colorThemeId,
    setColorThemeId,
  } = useAppStore();
  const { currentTheme, isLight } = useAppTheme();

  // ─── Convex (single source of truth for preferences) ──────────────
  const preferences = useQuery(api.preferences.get);
  const updatePreferences = useMutation(
    api.preferences.update,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.preferences.get, {});
    if (current !== undefined) {
      // Merge notifications once so multiple sub-field args combine instead
      // of clobbering each other. Matches backend order: args.notifications
      // is applied first, then sub-field merges win on top.
      const hasNotificationsChange =
        args.notifications !== undefined ||
        args.notificationReach !== undefined ||
        args.notificationQuietWindow !== undefined ||
        args.notificationTimezone !== undefined;

      const mergedNotifications = hasNotificationsChange
        ? {
            ...(args.notifications ?? current.notifications),
            ...(args.notificationReach !== undefined && { reach: args.notificationReach }),
            ...(args.notificationQuietWindow !== undefined && {
              quietWindow: args.notificationQuietWindow ?? undefined,
            }),
            ...(args.notificationTimezone !== undefined && { timezone: args.notificationTimezone }),
          }
        : undefined;

      localStore.setQuery(api.preferences.get, {}, {
        ...current,
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.reducedMotion !== undefined && { reducedMotion: args.reducedMotion }),
        ...(args.mirrorTone !== undefined && { mirrorTone: args.mirrorTone }),
        ...(args.contributeByDefault !== undefined && { contributeByDefault: args.contributeByDefault }),
        ...(args.dataRetentionPreference !== undefined && { dataRetentionPreference: args.dataRetentionPreference }),
        ...(args.preferredInputType !== undefined && { preferredInputType: args.preferredInputType }),
        ...(args.colorTheme !== undefined && { colorTheme: args.colorTheme }),
        ...(args.spaceName !== undefined && { spaceName: args.spaceName ?? undefined }),
        ...(args.spaceNamePromptDismissed !== undefined && { spaceNamePromptDismissed: args.spaceNamePromptDismissed }),
        // Mirrors the server's set-only-true rule, including the tone-change
        // inference — the flag is never turned back off.
        ...((args.registerComplaint ||
          (args.mirrorTone !== undefined && args.mirrorTone !== current.mirrorTone)) && {
          registerComplaint: true,
        }),
        ...(mergedNotifications !== undefined && { notifications: mergedNotifications }),
      });
    }
  });
  const requestDataWipe = useMutation(api.users.requestDataWipe);

  // ─── Reach & Quiet Window ────────────────────────────────────────────
  const reach = (preferences?.notifications?.reach ?? "warm") as "warm" | "direct" | "quiet";

  const quietWindow = preferences?.notifications?.quietWindow ?? null;

  const setReach = (next: "warm" | "direct" | "quiet") => {
    updatePreferences({ notificationReach: next });
  };

  const setQuietWindow = (window: { dontReachBefore: number; dontReachAfter: number } | null) => {
    updatePreferences({ notificationQuietWindow: window });
  };

  const syncTimezone = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        await updatePreferences({ notificationTimezone: timezone });
      }
    } catch {
      // Non-blocking
    }
  };

  // ─── Sign-in method ──────────────────────────────────────────────────
  const signInMethod = (() => {
    if (!user) return "—";
    const ext = user.externalAccounts?.[0];
    if (!ext) return "Email";
    const provider = (ext.provider ?? "").toLowerCase();
    if (provider.includes("apple")) return "Apple";
    if (provider.includes("google")) return "Google";
    return "Email";
  })();

  // ─── Theme display ──────────────────────────────────────────────────
  // Use storedTheme (Zustand) as the source of truth, not Uniwind's runtime
  // hasAdaptiveThemes — that flips to false when setColorTheme applies a
  // concrete variant like 'lavender-dark', even when the user's mode is system.
  const themeDisplay = storedTheme === 'system' ? "System" : storedTheme === 'light' ? "Light" : "Dark";

  // ─── Theme switching ────────────────────────────────────────────────
  const setThemeMode = (mode: ThemeMode) => {
    if (mode === "system") {
      Uniwind.setTheme("system" as never);
      storeSetTheme("system");
      updatePreferences({ theme: "system" });
      return;
    }

    const stripped = currentTheme
      .replace(/-light$/, "")
      .replace(/-dark$/, "");
    const isBaseOnly = stripped === "light" || stripped === "dark";

    const nextTheme = isBaseOnly
      ? mode
      : (`${stripped}-${mode}` as never);

    Uniwind.setTheme(nextTheme);
    storeSetTheme(mode);
    updatePreferences({ theme: mode });
  };

  // ─── Toggles (derived from Convex preferences) ─────────────────────
  const reducedMotion = preferences?.reducedMotion ?? false;
  const contributeAnonymously =
    preferences?.contributeByDefault ?? false;

  const setReducedMotion = (v: boolean) => {
    updatePreferences({ reducedMotion: v });
  };

  const setContributeAnonymously = (v: boolean) => {
    updatePreferences({ contributeByDefault: v });
  };

  // ─── Color theme ────────────────────────────────────────────────────
  const setColorTheme = (themeId: string) => {
    // Reuse the stripping/reassembly pattern from setThemeMode.
    // Determine the current light/dark suffix from storedTheme.
    const mode =
      storedTheme === 'system'
        ? (isLight ? 'light' : 'dark')
        : storedTheme;
    const nextVariant =
      themeId === 'default' ? mode : (`${themeId}-${mode}` as never);
    Uniwind.setTheme(nextVariant);
    setColorThemeId(themeId);
    updatePreferences({ colorTheme: themeId });
  };

  // ─── Space name ─────────────────────────────────────────────────────
  const spaceName = preferences?.spaceName;

  const setSpaceName = async (next: string | null) => {
    await updatePreferences({ spaceName: next });
  };

  // ─── Mirror tone ───────────────────────────────────────────────────
  const mirrorTone: MirrorTone = preferences?.mirrorTone ?? "adaptive";

  const mirrorToneDisplay = mirrorTone.charAt(0).toUpperCase() + mirrorTone.slice(1);

  const setMirrorTone = (tone: MirrorTone) => {
    posthog.capture('tone_changed', { tone });
    updatePreferences({ mirrorTone: tone });
  };

  // ─── Data retention ──────────────────────────────────────────────────
  const retention: RetentionOption =
    preferences?.dataRetentionPreference ?? "indefinite";

  const retentionDisplay = retention === "indefinite" ? "Indefinite" : retention === "6_months" ? "6 months" : "1 year";

  const setRetention = (value: RetentionOption) => {
    updatePreferences({ dataRetentionPreference: value });
  };

  // ─── Destructive actions ────────────────────────────────────────────
  const performLogout = async () => {
    posthog.capture('user_signed_out');
    posthog.reset();
    try {
      await signOut();
    } catch {
      // Clerk will update its own auth state; ignore network errors
    }
  };

  const performDeleteData = async () => {
    await requestDataWipe();
  };

  return {
    // Account
    signInMethod,

    // Appearance
    themeDisplay,
    setThemeMode,
    storedTheme,
    colorThemeId,
    setColorTheme,

    // Toggles
    reducedMotion,
    setReducedMotion,
    contributeAnonymously,
    setContributeAnonymously,

    // Space name
    spaceName,
    setSpaceName,

    // Mirror tone
    mirrorTone,
    mirrorToneDisplay,
    setMirrorTone,

    // Data retention
    retention,
    retentionDisplay,
    setRetention,

    // Notifications — Reach & Quiet Window
    reach,
    setReach,
    quietWindow,
    setQuietWindow,
    syncTimezone,

    // Destructive actions
    performLogout,
    performDeleteData,
  };
};
