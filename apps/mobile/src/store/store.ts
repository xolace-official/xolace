/**
 * Global app store using Zustand with synchronous persistence.
 *
 * Storage uses expo-sqlite/kv-store (sync reads) so the store is
 * hydrated at creation time — no loading state needed.
 */

import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { ReadingModeKey } from "@/src/features/library/reader/reading-mode";
import type { TextureSetId } from "@/src/features/reflect/texture-sets";
import { zustandJSONStorage } from "@/src/lib/storage/unified-storage";
import { createIntakeSlice, type IntakeSlice } from "./intake-slice";
import {
	createPlusOfferSlice,
	type PlusOfferSlice,
	plusOfferPersistedKeys,
} from "./plus-offer-slice";

type ThemeSlice = {
	theme: "system" | "light" | "dark";
	setTheme: (t: "system" | "light" | "dark") => void;
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

type PendingEventPrompt = {
	text: string;
	label?: string;
	expiresAt: number;
	fromEntryId?: Id<"library_entries">;
};

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
	/** One-time flag — once true, the Plus dictation upsell never shows again on this device (#559). */
	dictationUpsellSeen: boolean;
	setDictationUpsellSeen: (v: boolean) => void;
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
	/** Highest streak day each account (by Clerk user id) has seen the calendar reveal for. */
	acknowledgedStreaks: Record<string, number>;
	/**
	 * The acknowledged day from before it was kept per account. It stands in
	 * for any account without its own entry, until the first write claims it
	 * (zeroed then).
	 */
	lastAcknowledgedStreak: number;
	setLastAcknowledgedStreak: (n: number, owner: string) => void;
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
	/** Profile number cards the person chose not to see. Per device. */
	hiddenProfileCards: ProfileCardId[];
	toggleProfileCard: (id: ProfileCardId) => void;
};

export type ProfileCardId = "calendar" | "rank" | "week";

/** Ephemeral, not persisted. Tracks store version check state. */
type UpdateCheckSlice = {
	isVersionChecked: boolean;
	setIsVersionChecked: (v: boolean) => void;
	isNewVersionAvailable: boolean;
	setIsNewVersionAvailable: (v: boolean) => void;
};

/** Ephemeral, not persisted. Set when user taps a notification to open the app. */
type LastNotificationSlice = {
	lastNotification: {
		content: string;
		notificationId: Id<"notification_log">;
	} | null;
	setLastNotification: (
		n: { content: string; notificationId: Id<"notification_log"> } | null
	) => void;
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
	/**
	 * The idle menu's scrim is on screen. It lives in the screen's content, so
	 * it can't cover the native header — the reflect screen takes its toolbar
	 * buttons down instead while this is true.
	 */
	idleMenuOpen: boolean;
	setIdleMenuOpen: (v: boolean) => void;
};

export type AppState = ThemeSlice &
	OnboardingSlice &
	TogglesSlice &
	PlusOfferSlice &
	IntakeSlice &
	PreferencesSlice &
	UpdateCheckSlice &
	LastNotificationSlice &
	ReplySeedSlice &
	ComposerOpenSlice;

export const useAppStore = create<AppState>()(
	devtools(
		persist(
			(set) => ({
				acknowledgedStreaks: {},
				addToSeenEventIds: (slug) =>
					set((s) =>
						s.seenEventIds.some((e) => e.slug === slug)
							? {}
							: {
									seenEventIds: [
										...s.seenEventIds,
										{ seenAt: Date.now(), slug },
									],
								}
					),

				bridgeIntroSeen: false,
				chatEnabledCached: false,

				colorThemeId: "default",
				devStarterEligible: false,
				dictationUpsellSeen: false,

				homeSheetBlocking: false,
				homeSheetOpen: false,

				introSeen: false,

				lastAcknowledgedStreak: 0,
				lastSeenVersion: null,
				libraryIntroSeen: false,
				markMenuItemSeen: (key) =>
					set((s) =>
						s.seenMenuItems.includes(key)
							? {}
							: { seenMenuItems: [...s.seenMenuItems, key] }
					),
				musicIntroSeen: false,

				nightModeEnabled: true,

				notifNudgeDismissed: false,

				pendingEventPrompt: null,

				previousTheme: null,
				pruneSeenEventIds: () =>
					set((s) => {
						const threshold = new Date();
						threshold.setMonth(threshold.getMonth() - 13);
						return {
							seenEventIds: s.seenEventIds.filter(
								(e) => e.seenAt >= threshold.getTime()
							),
						};
					}),
				reflectTourActive: false,

				reflectTourVersion: 0,
				returnWelcomeSeenAt: null,

				seenEventIds: [],

				seenMenuItems: [],
				setBridgeIntroSeen: (v) => set({ bridgeIntroSeen: v }),
				setChatEnabledCached: (v) => set({ chatEnabledCached: v }),
				setColorThemeId: (id) => set({ colorThemeId: id }),
				setDictationUpsellSeen: (v) => set({ dictationUpsellSeen: v }),
				setHomeSheetBlocking: (v) => set({ homeSheetBlocking: v }),
				setHomeSheetOpen: (v) => set({ homeSheetOpen: v }),
				setIntroSeen: (v) => set({ introSeen: v }),
				setLastAcknowledgedStreak: (n, owner) =>
					set((s) => ({
						acknowledgedStreaks: { ...s.acknowledgedStreaks, [owner]: n },
						lastAcknowledgedStreak: 0,
					})),
				setLastSeenVersion: (v) => set({ lastSeenVersion: v }),
				setLibraryIntroSeen: (v) => set({ libraryIntroSeen: v }),
				setMusicIntroSeen: (v) => set({ musicIntroSeen: v }),
				setNightModeEnabled: (v) => set({ nightModeEnabled: v }),
				setNotifNudgeDismissed: (v) => set({ notifNudgeDismissed: v }),
				setPendingEventPrompt: (prompt) => set({ pendingEventPrompt: prompt }),
				setPreviousTheme: (t) => set({ previousTheme: t }),
				setReflectTourActive: (v) => set({ reflectTourActive: v }),
				setReflectTourVersion: (v) => set({ reflectTourVersion: v }),
				setReturnWelcomeSeenAt: (n) => set({ returnWelcomeSeenAt: n }),
				setShakeHintSeen: (v) => set({ shakeHintSeen: v }),
				setStarterSuggestionsSeen: (v) => set({ starterSuggestionsSeen: v }),
				setSupportAudioIntroSeen: (v) => set({ supportAudioIntroSeen: v }),
				setTheme: (t) => set({ theme: t }),
				setToneTipSeen: (v) => set({ toneTipSeen: v }),
				setVentIntroSeen: (v) => set({ ventIntroSeen: v }),
				setXolacerPrimerSeen: (v) => set({ xolacerPrimerSeen: v }),
				shakeHintSeen: false,
				starterSuggestionsSeen: false,
				supportAudioIntroSeen: false,
				theme: "system",

				toneTipSeen: false,
				ventIntroSeen: false,
				xolacerPrimerSeen: false,

				...createPlusOfferSlice(set),

				...createIntakeSlice(set),
				clearComposerOpenRequest: () => set({ composerOpenRequested: false }),
				clearLastNotification: () => set({ lastNotification: null }),
				clearReplySeed: () => set({ replySeed: null }),
				composerOpenRequested: false,
				hiddenProfileCards: [],
				idleMenuOpen: false,
				isNewVersionAvailable: false,

				isVersionChecked: false,

				lastNotification: null,
				readByFire: false,
				readerTextSize: 18,
				readingMode: "classic",

				reflectSettled: false,

				replySeed: null,
				requestComposerOpen: () => set({ composerOpenRequested: true }),
				setIdleMenuOpen: (v) => set({ idleMenuOpen: v }),
				setIsNewVersionAvailable: (v) => set({ isNewVersionAvailable: v }),
				setIsVersionChecked: (v) => set({ isVersionChecked: v }),
				setLastNotification: (n) => set({ lastNotification: n }),
				setReadByFire: (on) => set({ readByFire: on }),
				setReaderTextSize: (n) => set({ readerTextSize: n }),
				setReadingMode: (m) => set({ readingMode: m }),
				setReflectSettled: (v) => set({ reflectSettled: v }),
				setReplySeed: (reply) => set({ replySeed: reply }),
				setTextureSetId: (id) => set({ textureSetId: id }),

				textureSetId: "flat",
				toggleProfileCard: (id) =>
					set((s) => ({
						hiddenProfileCards: s.hiddenProfileCards.includes(id)
							? s.hiddenProfileCards.filter((c) => c !== id)
							: [...s.hiddenProfileCards, id],
					})),
			}),
			{
				name: "xolace-app",
				partialize: (s) => ({
					acknowledgedStreaks: s.acknowledgedStreaks,
					bridgeIntroSeen: s.bridgeIntroSeen,
					chatEnabledCached: s.chatEnabledCached,
					colorThemeId: s.colorThemeId,
					devStarterEligible: s.devStarterEligible,
					dictationUpsellSeen: s.dictationUpsellSeen,
					hiddenProfileCards: s.hiddenProfileCards,
					introSeen: s.introSeen,
					lastAcknowledgedStreak: s.lastAcknowledgedStreak,
					lastSeenVersion: s.lastSeenVersion,
					libraryIntroSeen: s.libraryIntroSeen,
					musicIntroSeen: s.musicIntroSeen,
					nightModeEnabled: s.nightModeEnabled,
					notifNudgeDismissed: s.notifNudgeDismissed,
					pendingEventPrompt: s.pendingEventPrompt,
					previousTheme: s.previousTheme,
					readByFire: s.readByFire,
					readerTextSize: s.readerTextSize,
					readingMode: s.readingMode,
					reflectTourVersion: s.reflectTourVersion,
					returnWelcomeSeenAt: s.returnWelcomeSeenAt,
					seenEventIds: s.seenEventIds,
					seenMenuItems: s.seenMenuItems,
					shakeHintSeen: s.shakeHintSeen,
					starterSuggestionsSeen: s.starterSuggestionsSeen,
					supportAudioIntroSeen: s.supportAudioIntroSeen,
					textureSetId: s.textureSetId,
					theme: s.theme,
					toneTipSeen: s.toneTipSeen,
					ventIntroSeen: s.ventIntroSeen,
					xolacerPrimerSeen: s.xolacerPrimerSeen,
					...plusOfferPersistedKeys(s),
				}),
				storage: createJSONStorage(() => zustandJSONStorage),
			}
		)
	)
);
