import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useColorScheme } from "react-native";
import { setThemeWithFonts } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { themeVariant } from "@/design/themes";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { Appearance } from "@/features/settings/appearance/appearance-data";
import {
	cardFlip,
	hiddenCards,
	modeNote,
	modeTheme,
	motionNote,
	pickMode,
	profileRows,
	stripStart,
	themeCards,
	themeNote,
	themeTap,
} from "@/features/settings/appearance/appearance-model";
import { saveFailed } from "@/features/settings/use-save-failed";
import { useOSReducedMotion } from "@/lib/motion/os-reduced-motion";
import { resolveMotionPreference } from "@/lib/motion/use-effective-reduced-motion";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { useAppStore } from "@/store/store";

function useProfileCards() {
	const server = useQuery(api.preferences.profileCards.getHidden);
	const device = useAppStore((s) => s.hiddenProfileCards);
	const forget = useAppStore((s) => s.toggleProfileCard);
	const setHidden = useMutation(
		api.preferences.profileCards.setHidden
	).withOptimisticUpdate((store, { card, hidden }) => {
		const current = store.getQuery(api.preferences.profileCards.getHidden, {});
		if (current === undefined) {
			return;
		}
		const without = current.filter((c) => c !== card);
		store.setQuery(
			api.preferences.profileCards.getHidden,
			{},
			hidden ? [...without, card] : without
		);
	});
	return {
		rows: profileRows(hiddenCards(server, device)),
		show: (id: Parameters<typeof cardFlip>[0], show: boolean) => {
			const flip = cardFlip(id, show, device);
			if (flip.forgetOnDevice) {
				forget(id);
			}
			setHidden({ card: id, hidden: flip.hidden }).catch(saveFailed);
		},
	};
}

export function useAppearance(): Appearance {
	const preferences = useQuery(api.preferences.get);
	const save = usePreferenceMutation();
	const mode = useAppStore((s) => s.theme);
	const setStoredMode = useAppStore((s) => s.setTheme);
	const colorThemeId = useAppStore((s) => s.colorThemeId);
	const setColorThemeId = useAppStore((s) => s.setColorThemeId);
	const nightMode = useAppStore((s) => s.nightModeEnabled);
	const setNightMode = useAppStore((s) => s.setNightModeEnabled);
	const setIntroSeen = useAppStore((s) => s.setIntroSeen);
	const scheme = useScheme();
	const osDark = useColorScheme() === "dark";
	const osReduce = useOSReducedMotion();
	const { status } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const cards = useProfileCards();
	const [replayOpen, setReplayOpen] = useState(false);

	const motion = resolveMotionPreference(
		preferences?.motionPreference,
		preferences?.reducedMotion
	);

	return {
		actions: {
			pickTheme: (id) => {
				const tap = themeTap(id, status);
				if (tap === "locked") {
					openPaywall("premium_theme");
				}
				if (tap !== "pick") {
					return;
				}
				setThemeWithFonts(themeVariant(id, pickMode(mode, scheme)));
				setColorThemeId(id);
				save({ colorTheme: id }).catch(saveFailed);
			},
			replayIntro: () => {
				setReplayOpen(false);
				setIntroSeen(false);
			},
			setMode: (next) => {
				setThemeWithFonts(modeTheme(next, colorThemeId));
				setStoredMode(next);
				save({ theme: next }).catch(saveFailed);
			},
			setMotion: (next) => {
				save({ motionPreference: next }).catch(saveFailed);
			},
			setNightMode,
			setReplayOpen,
			showProfileCard: cards.show,
		},
		state: {
			mode,
			modeNote: modeNote(mode, osDark),
			motion,
			motionNote: motionNote(motion, osReduce),
			nightMode,
			previewScheme: scheme,
			profileCards: cards.rows,
			replayOpen,
			themeNote: themeNote(colorThemeId, status),
			themeStart: stripStart(colorThemeId),
			themes: themeCards(colorThemeId, status),
		},
	};
}
