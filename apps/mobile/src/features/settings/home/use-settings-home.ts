import { useUser } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import { useState } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { HOME_COPY } from "@/features/settings/home/copy";
import {
	modeLabel,
	notificationsLabel,
	plusCard,
	signInOf,
	toneLabel,
	updateRow,
	versionLabel,
} from "@/features/settings/home/home-model";
import type { SettingsHome } from "@/features/settings/home/settings-home-data";
import { shownTone } from "@/features/settings/mirror/mirror-model";
import { useTalkTime } from "@/lib/talk/use-talk-time";
import { useAppStore } from "@/store/store";

const UPDATES_ENABLED = Updates.isEnabled && !__DEV__;

function useUpdateCheck() {
	const {
		currentlyRunning,
		isChecking,
		isDownloading,
		isUpdateAvailable,
		isUpdatePending,
	} = Updates.useUpdates();
	const [result, setResult] = useState<"up-to-date" | "failed" | null>(null);

	const check = async () => {
		if (!UPDATES_ENABLED || isChecking || isDownloading || isUpdatePending) {
			return;
		}
		setResult(null);
		try {
			const found = await Updates.checkForUpdateAsync();
			if (!found.isAvailable) {
				setResult("up-to-date");
			}
		} catch {
			setResult("failed");
		}
	};

	const updatedAt =
		UPDATES_ENABLED &&
		!currentlyRunning.isEmbeddedLaunch &&
		currentlyRunning.createdAt
			? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
					currentlyRunning.createdAt
				)
			: null;

	return {
		check,
		row: updateRow({
			available: isUpdateAvailable,
			checking: isChecking,
			downloading: isDownloading,
			enabled: UPDATES_ENABLED,
			pending: isUpdatePending,
			result,
		}),
		version: versionLabel({
			channel: currentlyRunning.channel ?? Updates.channel,
			updateDate: updatedAt,
			version: Constants.expoConfig?.version,
		}),
	};
}

export function useSettingsHome(): SettingsHome {
	const preferences = useQuery(api.preferences.get);
	const { user } = useUser();
	const { status, isPlus } = usePlusEntitlement();
	const time = useTalkTime(isPlus);
	const openPaywall = usePaywall((s) => s.open);
	const theme = useAppStore((s) => s.theme);
	const update = useUpdateCheck();

	const signIn = user
		? HOME_COPY.signIn[
				signInOf(user.externalAccounts.map((a) => a.provider ?? ""))
			]
		: undefined;

	return {
		actions: {
			checkForUpdates: () => {
				update.check().catch(() => undefined);
			},
			open: (to) => router.push(`/settings/${to}`),
			openPlus: () => openPaywall("settings_row"),
			openWhatsNew: () => router.push("/ratings/whats-new"),
		},
		state: {
			mode: modeLabel(theme),
			notifications: notificationsLabel(preferences?.notifications?.enabled),
			plus: plusCard(status, time),
			signIn,
			tone: toneLabel(
				preferences?.mirrorTone && shownTone(preferences.mirrorTone, status)
			),
			update: update.row,
			version: update.version,
		},
	};
}
