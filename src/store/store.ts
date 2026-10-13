/**
 * Global app store using Zustand with synchronous persistence.
 *
 * Storage uses expo-sqlite/kv-store (sync reads) so the store is
 * hydrated at creation time — no loading state needed.
 */
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { zustandJSONStorage } from '@/src/lib/storage/unified-storage';
import type { Id } from '@/convex/_generated/dataModel';
import type { TextureSetId } from '@/src/features/reflect/texture-sets';
import type { ReadingModeKey } from '@/src/features/library/reader/reading-mode';
import {
  createPlusOfferSlice,
  plusOfferPersistedKeys,
  type PlusOfferSlice,
} from './plus-offer-slice';
import { createIntakeSlice, type IntakeSlice } from './intake-slice';

type ThemeSlice = {
  theme: 'system' | 'light' | 'dark';
  setTheme: (t: 'system' | 'light' | 'dark') => void;
  /** The active color palette ID (e.g. 'default', 'lavender'). */
  colorThemeId: string;
  setColorThemeId: (id: string) => void;
  /** Theme stashed before 3am Mode activates — restored when exiting the night window. */
  previousTheme: string | null;
  setPreviousTheme: (t: string | null) => void;
};

type OnboardingSlice = {
  introSeen: boolean;
  setIntroSeen: (v: boolean) => void;
  /**
   * True while any home sheet (return welcome, follow-up,
   * monthly event, starter suggestions) is open or armed to open. Transient — never persisted.
   * The reflect tour reads this so its coach marks don't render underneath a
   * sheet that is about to cover them.
   */
  homeSheetBlocking: boolean;
  setHomeSheetBlocking: (v: boolean) => void;
  /**
   * A home sheet (return welcome, monthly event, starter suggestions) is on
   * screen right now. Transient — the streak reveal waits on it. Unlike
   * homeSheetBlocking it drops while a follow-up is merely pending.
   */
  homeSheetOpen: boolean;
  setHomeSheetOpen: (v: boolean) => void;
  /**
   * The first-run tour is on screen right now. Transient — the streak reveal
   * waits on it, not on the persisted version (a pending tour that can't start
   * yet would otherwise park the reveal).
   */
  reflectTourActive: boolean;
  setReflectTourActive: (v: boolean) => void;
};

type PendingEventPrompt = { text: string; label?: string; expiresAt: number; fromEntryId?: Id<'library_entries'> };

type TogglesSlice = {
  /** When true, SessionModeProvider auto-activates 3am Mode between 10pm–4am. */
  nightModeEnabled: boolean;
  setNightModeEnabled: (v: boolean) => void;
  /** One-time flag — once true, tone tip banner never shows again on this device. */
  toneTipSeen: boolean;
  setToneTipSeen: (v: boolean) => void;
  /** One-time flag — once dismissed, session-end notification nudge never shows again. */
  notifNudgeDismissed: boolean;
  setNotifNudgeDismissed: (v: boolean) => void;
  /** Version of the reflect tour this device last finished. `0` means none. */
  reflectTourVersion: number;
  setReflectTourVersion: (v: number) => void;
  /** One-time flag — once true, bridge first-run intro modal never shows again. */
  bridgeIntroSeen: boolean;
  setBridgeIntroSeen: (v: boolean) => void;
  /** One-time flag — once true, vent first-run intro never shows again. */
  ventIntroSeen: boolean;
  setVentIntroSeen: (v: boolean) => void;
  /** One-time flag — once true, the Xolacer primer never gates a request again. */
  xolacerPrimerSeen: boolean;
  setXolacerPrimerSeen: (v: boolean) => void;
  /** One-time flag — once true, the Music family welcome never shows again. */
  musicIntroSeen: boolean;
  setMusicIntroSeen: (v: boolean) => void;
  /** One-time flag — once true, the Support audio family welcome never shows again. */
  supportAudioIntroSeen: boolean;
  setSupportAudioIntroSeen: (v: boolean) => void;
  /** One-time flag — once true, the Lantern (library) welcome never shows again. */
  libraryIntroSeen: boolean;
  setLibraryIntroSeen: (v: boolean) => void;
  /** One-time flag — once true, the home Starter suggestions bubble never shows again (#460). */
  starterSuggestionsSeen: boolean;
  setStarterSuggestionsSeen: (v: boolean) => void;
  /** Dev tools only (honoured under `__DEV__`): treat this account as zero-session for Starter suggestions (#465). */
  devStarterEligible: boolean;
  /** Last resolved `xolacerChat.status().enabled` — lets a returning chat user connect before the live query answers (#342). */
  chatEnabledCached: boolean;
  setChatEnabledCached: (v: boolean) => void;
  /** One-time flag — once true, the "shake to send feedback" hint toast never shows again. */
  shakeHintSeen: boolean;
  setShakeHintSeen: (v: boolean) => void;
  /** `lastSessionAt` value the Return Welcome greeting was last shown against. Keys "once per return episode". */
  returnWelcomeSeenAt: number | null;
  setReturnWelcomeSeenAt: (n: number) => void;
  /** Id of the newest What's New entry the user has opened. Drives the menu's unseen badge. */
  lastSeenVersion: string | null;
  setLastSeenVersion: (v: string) => void;
  /** Menu item keys whose "new" glow has been acknowledged (item opened once). */
  seenMenuItems: string[];
  markMenuItemSeen: (key: string) => void;
  /** Highest streak day the user has seen the calendar reveal for. */
  lastAcknowledgedStreak: number;
  setLastAcknowledgedStreak: (n: number) => void;
  /** Awareness event slugs the user has already seen, with timestamps for pruning. */
  seenEventIds: { slug: string; seenAt: number }[];
  addToSeenEventIds: (slug: string) => void;
  /** Drops entries older than 13 months. Called on hook mount, not during render. */
  pruneSeenEventIds: () => void;
  /**
   * Session prompt the next reflect session opens on: a monthly event's
   * sessionPrompt (7 days), or a Library entry's "Reflect on this" (#413),
   * which also carries the entry the session records.
   */
  pendingEventPrompt: PendingEventPrompt | null;
  setPendingEventPrompt: (prompt: PendingEventPrompt | null) => void;
};

type PreferencesSlice = {
  textureSetId: TextureSetId;
  setTextureSetId: (id: TextureSetId) => void;
  /** The Lantern reader's reading mode and base text size (#408). Per device. */
  readingMode: ReadingModeKey;
  setReadingMode: (m: ReadingModeKey) => void;
  readerTextSize: number;
  setReaderTextSize: (n: number) => void;
  /** "Read by the fire" (#413): the reader's dimmed ambience, independent of the reading mode. */
  readByFire: boolean;
  setReadByFire: (on: boolean) => void;
};

/** Ephemeral, not persisted. Tracks store version check state. */
type UpdateCheckSlice = {
  isVersionChecked: boolean;
  setIsVersionChecked: (v: boolean) => void;
  isNewVersionAvailable: boolean;
  setIsNewVersionAvailable: (v: boolean) => void;
};

/** Ephemeral, not persisted. Set when user taps a notification to open the app. */
type LastNotificationSlice = {
  lastNotification: { content: string; notificationId: Id<"notification_log"> } | null;
  setLastNotification: (n: { content: string; notificationId: Id<"notification_log"> } | null) => void;
  clearLastNotification: () => void;
};

/**
 * Ephemeral, not persisted. A kept quote reply the user chose to start a
 * session from (#316) — the reflect card reads it, the composer never does.
 * Not a route param: this is raw user text, and params ride in navigation
 * state and history.
 */
type ReplySeedSlice = {
  replySeed: string | null;
  setReplySeed: (reply: string) => void;
  clearReplySeed: () => void;
};

/**
 * Ephemeral, not persisted. Something outside the reflect screen (the Reflect
 * starter suggestion, #462) asking it to open the card — see
 * useReflectBridge.
 */
type ComposerOpenSlice = {
  /** The reflect screen has loaded and its card has finished arriving. */
  reflectSettled: boolean;
  setReflectSettled: (v: boolean) => void;
  composerOpenRequested: boolean;
  requestComposerOpen: () => void;
  clearComposerOpenRequest: () => void;
};

export type AppState = ThemeSlice & OnboardingSlice & TogglesSlice & PlusOfferSlice & IntakeSlice & PreferencesSlice & UpdateCheckSlice & LastNotificationSlice & ReplySeedSlice & ComposerOpenSlice;

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'system',
        setTheme: (t) => set({ theme: t }),

        colorThemeId: 'default',
        setColorThemeId: (id) => set({ colorThemeId: id }),

        previousTheme: null,
        setPreviousTheme: (t) => set({ previousTheme: t }),

        introSeen: false,
        setIntroSeen: (v) => set({ introSeen: v }),

        homeSheetBlocking: false,
        setHomeSheetBlocking: (v) => set({ homeSheetBlocking: v }),
        homeSheetOpen: false,
        setHomeSheetOpen: (v) => set({ homeSheetOpen: v }),
        reflectTourActive: false,
        setReflectTourActive: (v) => set({ reflectTourActive: v }),

        nightModeEnabled: true,
        setNightModeEnabled: (v) => set({ nightModeEnabled: v }),

        toneTipSeen: false,
        setToneTipSeen: (v) => set({ toneTipSeen: v }),

        notifNudgeDismissed: false,
        setNotifNudgeDismissed: (v) => set({ notifNudgeDismissed: v }),

        reflectTourVersion: 0,
        setReflectTourVersion: (v) => set({ reflectTourVersion: v }),

        bridgeIntroSeen: false,
        setBridgeIntroSeen: (v) => set({ bridgeIntroSeen: v }),
        ventIntroSeen: false,
        setVentIntroSeen: (v) => set({ ventIntroSeen: v }),
        xolacerPrimerSeen: false,
        setXolacerPrimerSeen: (v) => set({ xolacerPrimerSeen: v }),
        musicIntroSeen: false,
        setMusicIntroSeen: (v) => set({ musicIntroSeen: v }),
        supportAudioIntroSeen: false,
        setSupportAudioIntroSeen: (v) => set({ supportAudioIntroSeen: v }),
        libraryIntroSeen: false,
        setLibraryIntroSeen: (v) => set({ libraryIntroSeen: v }),
        starterSuggestionsSeen: false,
        setStarterSuggestionsSeen: (v) => set({ starterSuggestionsSeen: v }),
        devStarterEligible: false,
        chatEnabledCached: false,
        setChatEnabledCached: (v) => set({ chatEnabledCached: v }),
        shakeHintSeen: false,
        setShakeHintSeen: (v) => set({ shakeHintSeen: v }),
        returnWelcomeSeenAt: null,
        setReturnWelcomeSeenAt: (n) => set({ returnWelcomeSeenAt: n }),
        lastSeenVersion: null,
        setLastSeenVersion: (v) => set({ lastSeenVersion: v }),

        seenMenuItems: [],
        markMenuItemSeen: (key) =>
          set((s) =>
            s.seenMenuItems.includes(key)
              ? {}
              : { seenMenuItems: [...s.seenMenuItems, key] },
          ),

        lastAcknowledgedStreak: 0,
        setLastAcknowledgedStreak: (n) => set({ lastAcknowledgedStreak: n }),

        seenEventIds: [],
        addToSeenEventIds: (slug) =>
          set((s) =>
            s.seenEventIds.some((e) => e.slug === slug)
              ? {}
              : { seenEventIds: [...s.seenEventIds, { slug, seenAt: Date.now() }] },
          ),
        pruneSeenEventIds: () =>
          set((s) => {
            const threshold = new Date();
            threshold.setMonth(threshold.getMonth() - 13);
            return {
              seenEventIds: s.seenEventIds.filter(
                (e) => e.seenAt >= threshold.getTime(),
              ),
            };
          }),

        pendingEventPrompt: null,
        setPendingEventPrompt: (prompt) => set({ pendingEventPrompt: prompt }),

        ...createPlusOfferSlice(set),

        ...createIntakeSlice(set),

        textureSetId: 'flat',
        setTextureSetId: (id) => set({ textureSetId: id }),
        readingMode: 'classic',
        setReadingMode: (m) => set({ readingMode: m }),
        readerTextSize: 18,
        setReaderTextSize: (n) => set({ readerTextSize: n }),
        readByFire: false,
        setReadByFire: (on) => set({ readByFire: on }),

        isVersionChecked: false,
        setIsVersionChecked: (v) => set({ isVersionChecked: v }),
        isNewVersionAvailable: false,
        setIsNewVersionAvailable: (v) => set({ isNewVersionAvailable: v }),

        lastNotification: null,
        setLastNotification: (n) => set({ lastNotification: n }),
        clearLastNotification: () => set({ lastNotification: null }),

        replySeed: null,
        setReplySeed: (reply) => set({ replySeed: reply }),
        clearReplySeed: () => set({ replySeed: null }),

        reflectSettled: false,
        setReflectSettled: (v) => set({ reflectSettled: v }),
        composerOpenRequested: false,
        requestComposerOpen: () => set({ composerOpenRequested: true }),
        clearComposerOpenRequest: () => set({ composerOpenRequested: false }),
      }),
      {
        name: 'xolace-app',
        storage: createJSONStorage(() => zustandJSONStorage),
        partialize: (s) => ({
          theme: s.theme,
          colorThemeId: s.colorThemeId,
          previousTheme: s.previousTheme,
          introSeen: s.introSeen,
          nightModeEnabled: s.nightModeEnabled,
          toneTipSeen: s.toneTipSeen,
          notifNudgeDismissed: s.notifNudgeDismissed,
          reflectTourVersion: s.reflectTourVersion,
          bridgeIntroSeen: s.bridgeIntroSeen,
          ventIntroSeen: s.ventIntroSeen,
          xolacerPrimerSeen: s.xolacerPrimerSeen,
          musicIntroSeen: s.musicIntroSeen,
          supportAudioIntroSeen: s.supportAudioIntroSeen,
          libraryIntroSeen: s.libraryIntroSeen,
          starterSuggestionsSeen: s.starterSuggestionsSeen,
          devStarterEligible: s.devStarterEligible,
          chatEnabledCached: s.chatEnabledCached,
          shakeHintSeen: s.shakeHintSeen,
          returnWelcomeSeenAt: s.returnWelcomeSeenAt,
          lastSeenVersion: s.lastSeenVersion,
          seenMenuItems: s.seenMenuItems,
          lastAcknowledgedStreak: s.lastAcknowledgedStreak,
          textureSetId: s.textureSetId,
          readingMode: s.readingMode,
          readerTextSize: s.readerTextSize,
          readByFire: s.readByFire,
          seenEventIds: s.seenEventIds,
          pendingEventPrompt: s.pendingEventPrompt,
          ...plusOfferPersistedKeys(s),
        }),
      }
    )
  )
);
