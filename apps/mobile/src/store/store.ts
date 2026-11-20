/** Global Zustand store, hydrated synchronously at creation from expo-sqlite/kv-store. */

import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { TextureSetId } from "@/features/reflect/texture-sets";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import {
	type AccountFlagsSlice,
	accountFlagsPersistedKeys,
	createAccountFlagsSlice,
} from "./account-flags-slice";
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
	/** First run is playing someone into their seat after sign-in: the root guard keeps first run
	 * open until it lets go (src/features/navigation/root-gate.ts). Transient. */
	seatHeld: boolean;
	setSeatHeld: (v: boolean) => void;
	/** A sign-in landed (`setActive`) but its user row isn't there yet (`users.getOrCreate`). Every
	 * root reader of a `requireAuth` query waits on it: before the row exists those queries throw
	 * `user_not_found`, and the bootstrap boundary would swap the seat for a loader. Transient. */
	accountPending: boolean;
	setAccountPending: (v: boolean) => void;
	/** Home's reflect card has left idle: the composer is open (typing or a live mic), or a
	 * submit is on its way and has no session yet. Transient; the badge unlock moment and
	 * streak-held wait on it, since either would close the keyboard over a half-written
	 * reflection. */
	homeComposing: boolean;
	setHomeComposing: (v: boolean) => void;
	/** A home sheet is on screen right now. Transient. */
	homeSheetOpen: boolean;
	setHomeSheetOpen: (v: boolean) => void;
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
	/** One-time flag — once true, bridge first-run intro modal never shows again. */
	bridgeIntroSeen: boolean;
	setBridgeIntroSeen: (v: boolean) => void;
	/** One-time flag — once true, the Plus dictation upsell never shows again on this device
	 * (#559). */
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
	/** Last resolved `xolacerChat.status().enabled` — lets a returning chat user connect before
	 * the live query answers (#342). */
	chatEnabledCached: boolean;
	setChatEnabledCached: (v: boolean) => void;
	/** One-time flag — once true, the "shake to send feedback" hint toast never shows again. */
	shakeHintSeen: boolean;
	setShakeHintSeen: (v: boolean) => void;
	/** Id of the newest What's New entry the user has opened. Drives the menu's unseen badge. */
	lastSeenVersion: string | null;
	setLastSeenVersion: (v: string) => void;
	/** Awareness event slugs the v1 sheet already showed. Coming back reads it once to let that
	 * month's prompt pass (`useMonthEvent`); only the dev reset writes it now. */
	seenEventIds: { slug: string; seenAt: number }[];
	/** Prompt the next reflect session opens on: a monthly event's sessionPrompt (7 days) or a
	 * Library entry's "Reflect on this" (#413). */
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

/** The Lantern reader's reading modes (src/features/lantern/reader/reading-modes.ts). */
export type ReadingModeKey = "classic" | "clear" | "fire";

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

/** Ephemeral. A kept quote reply to start a session from (#316); raw user text, so never a
 * route param. */
type ReplySeedSlice = {
	replySeed: string | null;
	setReplySeed: (reply: string) => void;
	clearReplySeed: () => void;
};

export type AppState = ThemeSlice &
	OnboardingSlice &
	TogglesSlice &
	AccountFlagsSlice &
	PlusOfferSlice &
	PreferencesSlice &
	UpdateCheckSlice &
	LastNotificationSlice &
	ReplySeedSlice;

export const useAppStore = create<AppState>()(
	devtools(
		persist(
			(set) => ({
				accountPending: false,

				bridgeIntroSeen: false,
				chatEnabledCached: false,

				colorThemeId: "default",

				dictationUpsellSeen: false,

				homeComposing: false,
				homeSheetOpen: false,

				introSeen: false,

				lastSeenVersion: null,
				libraryIntroSeen: false,
				musicIntroSeen: false,

				nightModeEnabled: true,

				pendingEventPrompt: null,

				previousTheme: null,

				seatHeld: false,

				seenEventIds: [],

				setAccountPending: (v) => set({ accountPending: v }),
				setBridgeIntroSeen: (v) => set({ bridgeIntroSeen: v }),
				setChatEnabledCached: (v) => set({ chatEnabledCached: v }),
				setColorThemeId: (id) => set({ colorThemeId: id }),
				setDictationUpsellSeen: (v) => set({ dictationUpsellSeen: v }),
				setHomeComposing: (v) => set({ homeComposing: v }),
				setHomeSheetOpen: (v) => set({ homeSheetOpen: v }),
				setIntroSeen: (v) => set({ introSeen: v }),
				setLastSeenVersion: (v) => set({ lastSeenVersion: v }),
				setLibraryIntroSeen: (v) => set({ libraryIntroSeen: v }),
				setMusicIntroSeen: (v) => set({ musicIntroSeen: v }),
				setNightModeEnabled: (v) => set({ nightModeEnabled: v }),
				setPendingEventPrompt: (prompt) => set({ pendingEventPrompt: prompt }),
				setPreviousTheme: (t) => set({ previousTheme: t }),
				setSeatHeld: (v) => set({ seatHeld: v }),
				setShakeHintSeen: (v) => set({ shakeHintSeen: v }),
				setSupportAudioIntroSeen: (v) => set({ supportAudioIntroSeen: v }),
				setTheme: (t) => set({ theme: t }),
				setVentIntroSeen: (v) => set({ ventIntroSeen: v }),
				setXolacerPrimerSeen: (v) => set({ xolacerPrimerSeen: v }),
				shakeHintSeen: false,
				supportAudioIntroSeen: false,
				theme: "system",

				ventIntroSeen: false,
				xolacerPrimerSeen: false,

				...createAccountFlagsSlice(set),

				...createPlusOfferSlice(set),

				clearLastNotification: () => set({ lastNotification: null }),
				clearReplySeed: () => set({ replySeed: null }),
				hiddenProfileCards: [],
				isNewVersionAvailable: false,

				isVersionChecked: false,

				lastNotification: null,
				readByFire: false,
				readerTextSize: 18,
				readingMode: "classic",

				replySeed: null,
				setIsNewVersionAvailable: (v) => set({ isNewVersionAvailable: v }),
				setIsVersionChecked: (v) => set({ isVersionChecked: v }),
				setLastNotification: (n) => set({ lastNotification: n }),
				setReadByFire: (on) => set({ readByFire: on }),
				setReaderTextSize: (n) => set({ readerTextSize: n }),
				setReadingMode: (m) => set({ readingMode: m }),
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
					bridgeIntroSeen: s.bridgeIntroSeen,
					chatEnabledCached: s.chatEnabledCached,
					colorThemeId: s.colorThemeId,
					dictationUpsellSeen: s.dictationUpsellSeen,
					hiddenProfileCards: s.hiddenProfileCards,
					introSeen: s.introSeen,
					lastSeenVersion: s.lastSeenVersion,
					libraryIntroSeen: s.libraryIntroSeen,
					musicIntroSeen: s.musicIntroSeen,
					nightModeEnabled: s.nightModeEnabled,
					pendingEventPrompt: s.pendingEventPrompt,
					previousTheme: s.previousTheme,
					readByFire: s.readByFire,
					readerTextSize: s.readerTextSize,
					readingMode: s.readingMode,
					seenEventIds: s.seenEventIds,
					shakeHintSeen: s.shakeHintSeen,
					supportAudioIntroSeen: s.supportAudioIntroSeen,
					textureSetId: s.textureSetId,
					theme: s.theme,
					ventIntroSeen: s.ventIntroSeen,
					xolacerPrimerSeen: s.xolacerPrimerSeen,
					...accountFlagsPersistedKeys(s),
					...plusOfferPersistedKeys(s),
				}),
				storage: createJSONStorage(() => zustandJSONStorage),
			}
		)
	)
);
