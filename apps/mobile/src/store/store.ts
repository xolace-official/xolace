import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { TextureSetId } from "@/features/reflect/texture-sets";
import { LATEST_RELEASE } from "@/lib/release-notes";
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
import {
	createRatingsSlice,
	type RatingsSlice,
	ratingsPersistedKeys,
} from "./ratings-slice";

type ThemeSlice = {
	theme: "system" | "light" | "dark";
	setTheme: (t: "system" | "light" | "dark") => void;
	colorThemeId: string;
	setColorThemeId: (id: string) => void;
	previousTheme: string | null;
	setPreviousTheme: (t: string | null) => void;
};

type OnboardingSlice = {
	introSeen: boolean;
	setIntroSeen: (v: boolean) => void;
	seatHeld: boolean;
	setSeatHeld: (v: boolean) => void;
	accountPending: boolean;
	setAccountPending: (v: boolean) => void;
	homeComposing: boolean;
	setHomeComposing: (v: boolean) => void;
	homeSheetBlocking: boolean;
	setHomeSheetBlocking: (v: boolean) => void;
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
	nightModeEnabled: boolean;
	setNightModeEnabled: (v: boolean) => void;
	bridgeIntroSeen: boolean;
	setBridgeIntroSeen: (v: boolean) => void;
	dictationUpsellSeen: boolean;
	setDictationUpsellSeen: (v: boolean) => void;
	ventIntroSeen: boolean;
	setVentIntroSeen: (v: boolean) => void;
	xolacerPrimerSeen: boolean;
	setXolacerPrimerSeen: (v: boolean) => void;
	musicIntroSeen: boolean;
	setMusicIntroSeen: (v: boolean) => void;
	supportAudioIntroSeen: boolean;
	setSupportAudioIntroSeen: (v: boolean) => void;
	libraryIntroSeen: boolean;
	setLibraryIntroSeen: (v: boolean) => void;
	chatEnabledCached: boolean;
	setChatEnabledCached: (v: boolean) => void;
	shakeHintSeen: boolean;
	setShakeHintSeen: (v: boolean) => void;
	seenEventIds: { slug: string; seenAt: number }[];
	pendingEventPrompt: PendingEventPrompt | null;
	setPendingEventPrompt: (prompt: PendingEventPrompt | null) => void;
};

type PreferencesSlice = {
	textureSetId: TextureSetId;
	setTextureSetId: (id: TextureSetId) => void;
	readingMode: ReadingModeKey;
	setReadingMode: (m: ReadingModeKey) => void;
	readerTextSize: number;
	setReaderTextSize: (n: number) => void;
	readByFire: boolean;
	setReadByFire: (on: boolean) => void;
	hiddenProfileCards: ProfileCardId[];
	toggleProfileCard: (id: ProfileCardId) => void;
};

export type ReadingModeKey = "classic" | "clear" | "fire";

export type ProfileCardId = "calendar" | "rank" | "week";

type UpdateCheckSlice = {
	isVersionChecked: boolean;
	setIsVersionChecked: (v: boolean) => void;
	isNewVersionAvailable: boolean;
	setIsNewVersionAvailable: (v: boolean) => void;
};

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
	RatingsSlice &
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
				homeSheetBlocking: false,
				homeSheetOpen: false,

				introSeen: false,

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
				setHomeSheetBlocking: (v) => set({ homeSheetBlocking: v }),
				setHomeSheetOpen: (v) => set({ homeSheetOpen: v }),
				setIntroSeen: (v) => set({ introSeen: v }),
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

				...createRatingsSlice(set),

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
				onRehydrateStorage: () => (state) => {
					state?.noteReleaseRan(LATEST_RELEASE.id);
				},
				partialize: (s) => ({
					bridgeIntroSeen: s.bridgeIntroSeen,
					chatEnabledCached: s.chatEnabledCached,
					colorThemeId: s.colorThemeId,
					dictationUpsellSeen: s.dictationUpsellSeen,
					hiddenProfileCards: s.hiddenProfileCards,
					introSeen: s.introSeen,
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
					...ratingsPersistedKeys(s),
				}),
				storage: createJSONStorage(() => zustandJSONStorage),
			}
		)
	)
);
