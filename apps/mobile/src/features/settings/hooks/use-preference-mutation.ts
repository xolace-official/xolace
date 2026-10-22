import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Single-sourced optimistic-update mutation for preferences.
 * Every sub-screen hook calls this instead of wiring its own copy.
 * Convex deduplicates the underlying `useQuery(api.preferences.get)` across
 * all components, so subscribing in multiple hooks adds zero extra network cost.
 */
export const usePreferenceMutation = () =>
  useMutation(api.preferences.update).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.preferences.get, {});
    if (current === undefined) return;

    const hasNotificationsChange =
      args.notifications !== undefined ||
      args.notificationReach !== undefined ||
      args.notificationQuietWindow !== undefined ||
      args.notificationTimezone !== undefined;

    const mergedNotifications = hasNotificationsChange
      ? {
          // Merge, mirroring the server: the whole-object form carries only the
          // fields this installed client knows about, so replacing would drop
          // any newer preference from the snapshot until the round-trip lands.
          ...current.notifications,
          ...args.notifications,
          ...(args.notificationReach !== undefined && { reach: args.notificationReach }),
          ...(args.notificationQuietWindow !== undefined && {
            quietWindow: args.notificationQuietWindow ?? undefined,
          }),
          ...(args.notificationTimezone !== undefined && { timezone: args.notificationTimezone }),
        }
      : undefined;

    // Mirror the server's bidirectional sync so the optimistic snapshot matches
    // what the mutation writes: motionPreference is the source of truth, and
    // reducedMotion is its back-compat boolean projection (and vice-versa).
    const motionPatch =
      args.motionPreference !== undefined
        ? { motionPreference: args.motionPreference, reducedMotion: args.motionPreference === "reduced" }
        : args.reducedMotion !== undefined
          ? { motionPreference: args.reducedMotion ? ("reduced" as const) : ("system" as const), reducedMotion: args.reducedMotion }
          : undefined;

    localStore.setQuery(api.preferences.get, {}, {
      ...current,
      ...(args.theme !== undefined && { theme: args.theme }),
      ...(motionPatch !== undefined && motionPatch),
      ...(args.mirrorTone !== undefined && { mirrorTone: args.mirrorTone }),
      ...(args.contributeByDefault !== undefined && { contributeByDefault: args.contributeByDefault }),
      ...(args.dataRetentionPreference !== undefined && { dataRetentionPreference: args.dataRetentionPreference }),
      ...(args.preferredInputType !== undefined && { preferredInputType: args.preferredInputType }),
      ...(args.colorTheme !== undefined && { colorTheme: args.colorTheme }),
      ...(args.spaceName !== undefined && { spaceName: args.spaceName ?? undefined }),
      ...(args.voice !== undefined && { voice: args.voice ?? undefined }),
      ...(args.talkVoice !== undefined && { talkVoice: args.talkVoice ?? undefined }),
      ...(args.talkPace !== undefined && { talkPace: args.talkPace }),
      ...(args.talkDirectness !== undefined && { talkDirectness: args.talkDirectness ?? undefined }),
      ...(args.spaceNamePromptDismissed !== undefined && { spaceNamePromptDismissed: args.spaceNamePromptDismissed }),
      // Mirrors the server's set-only-true rule, including the tone-change
      // inference — the flag is never turned back off.
      ...((args.registerComplaint ||
        (args.mirrorTone !== undefined && args.mirrorTone !== current.mirrorTone)) && {
        registerComplaint: true,
      }),
      ...(mergedNotifications !== undefined && { notifications: mergedNotifications }),
    });
  });
