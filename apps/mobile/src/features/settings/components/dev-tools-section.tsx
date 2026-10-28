/**
 * Dev-only settings section for manual testing. Render it behind a
 * `__DEV__` check at the call site — it has no production guard of its
 * own (the Convex mutation it calls is gated server-side instead).
 */

import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { SymbolView } from "expo-symbols";
import { useThemeColor, useToast } from "heroui-native";
import { useState } from "react";
import { ReturnWelcomeSheet } from "@/features/reflect/components/return-welcome-sheet";
import type { ReturnWelcomeTier } from "@/features/reflect/return-welcome-copy";
import { StarterSuggestionsDevRows } from "@/features/starter-suggestions/starter-dev-rows";
import { useAppStore } from "@/store/store";
import type { CrossPlatformSymbol } from "./settings-icons";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

const BUMP_ICON: CrossPlatformSymbol = {
	android: "local_fire_department",
	ios: "flame",
	web: "local_fire_department",
};
const RESET_ICON: CrossPlatformSymbol = {
	android: "restart_alt",
	ios: "arrow.counterclockwise",
	web: "restart_alt",
};
const REPLAY_ICON: CrossPlatformSymbol = {
	android: "replay",
	ios: "play.circle",
	web: "replay",
};
const AWARENESS_ICON: CrossPlatformSymbol = {
	android: "event_repeat",
	ios: "calendar.badge.clock",
	web: "event_repeat",
};
const RETURN_ICON: CrossPlatformSymbol = {
	android: "waving_hand",
	ios: "hand.wave",
	web: "waving_hand",
};
const FOLLOW_UP_ICON: CrossPlatformSymbol = {
	android: "notifications_active",
	ios: "bell.badge",
	web: "notifications_active",
};
const INTAKE_ICON: CrossPlatformSymbol = {
	android: "restart_alt",
	ios: "figure.walk.arrival",
	web: "restart_alt",
};
const SENTRY_ICON: CrossPlatformSymbol = {
	android: "bug_report",
	ios: "ant.circle",
	web: "bug_report",
};

const FOLLOW_UP_TIERS: {
	tier: "acute" | "elevated" | "standard";
	label: string;
}[] = [
	{ label: "Seed follow-up · standard", tier: "standard" },
	{ label: "Seed follow-up · elevated", tier: "elevated" },
	{ label: "Seed follow-up · acute", tier: "acute" },
];

const RETURN_WELCOME_TIERS: { tier: ReturnWelcomeTier; label: string }[] = [
	{ label: "Return welcome · recent", tier: "recent" },
	{ label: "Return welcome · 14–30d", tier: "away-14-30" },
	{ label: "Return welcome · 30–90d", tier: "away-30-90" },
	{ label: "Return welcome · 90d+", tier: "away-90-plus" },
	{ label: "Return welcome · anniversary", tier: "anniversary" },
];

export const DevToolsSection = () => {
	const { toast } = useToast();
	const mutedIconColor = useThemeColor("muted") as string;
	const { userId } = useAuth();
	const setLastAcknowledgedStreak = useAppStore(
		(s) => s.setLastAcknowledgedStreak
	);
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const resetAwarenessEvents = () => {
		useAppStore.setState({ seenEventIds: [] });
		setPendingEventPrompt(null);
		toast.show({
			description: "Reopen home to see the card.",
			label: "Awareness events reset",
		});
	};
	const setStreak = useMutation(api.devTools.setStreak);
	const seedFollowUpCard = useMutation(api.devTools.seedFollowUpCard);
	const resetIntake = useMutation(api.devTools.resetIntake);
	const [busy, setBusy] = useState(false);

	const seedFollowUp = (tier: "acute" | "elevated" | "standard") => {
		if (busy) {
			return;
		}
		setBusy(true);
		seedFollowUpCard({ tier })
			.then(() => {
				toast.show({
					description: "Go back to the reflect home to see the check-in.",
					label: `Follow-up card seeded · ${tier}`,
				});
			})
			.catch((e) => {
				toast.show({
					description:
						e instanceof Error ? e.message : "Is DEV_TOOLS_ENABLED set?",
					label: "Seed failed",
					variant: "danger",
				});
			})
			.finally(() => setBusy(false));
	};
	const [previewTier, setPreviewTier] = useState<ReturnWelcomeTier | null>(
		null
	);

	const icon = (name: CrossPlatformSymbol) => (
		<SymbolView name={name} size={17} tintColor={mutedIconColor} />
	);

	const runStreak = (mode: "bump" | "reset") => {
		if (busy) {
			return;
		}
		setBusy(true);
		setStreak({ mode })
			.then((newStreak) => {
				// Make the reveal pending: acknowledged = the day before
				if (userId) {
					setLastAcknowledgedStreak(Math.max(newStreak - 1, 0), userId);
				}
				toast.show({
					description: "Go back home to watch the reveal.",
					label: `Streak set to day ${newStreak}`,
				});
			})
			.catch(() => {
				toast.show({
					description: "Is DEV_TOOLS_ENABLED set on this deployment?",
					label: "Streak update failed",
					variant: "danger",
				});
			})
			.finally(() => setBusy(false));
	};

	const replayIntake = () => {
		if (busy) {
			return;
		}
		setBusy(true);
		// No navigation of our own: `onboardingComplete` is the root guard, so the
		// subscription that reads it swaps the whole group out from under us.
		resetIntake()
			.catch((e) => {
				toast.show({
					description:
						e instanceof Error ? e.message : "Is DEV_TOOLS_ENABLED set?",
					label: "Intake reset failed",
					variant: "danger",
				});
			})
			.finally(() => setBusy(false));
	};

	const replayReveal = () => {
		if (userId) {
			setLastAcknowledgedStreak(0, userId);
		}
		toast.show({
			description: "Go back home to watch it again.",
			label: "Reveal re-armed",
		});
	};

	return (
		<SettingsSection title="Dev tools">
			<SettingsRow
				icon={icon(BUMP_ICON)}
				label="Bump streak +1"
				onPress={() => runStreak("bump")}
				variant="action"
			/>
			<SettingsRow
				icon={icon(RESET_ICON)}
				label="Reset streak to day 1"
				onPress={() => runStreak("reset")}
				variant="action"
			/>
			<SettingsRow
				icon={icon(REPLAY_ICON)}
				label="Replay streak reveal"
				onPress={replayReveal}
				variant="action"
			/>
			<SettingsRow
				icon={icon(AWARENESS_ICON)}
				label="Reset awareness events"
				onPress={resetAwarenessEvents}
				variant="action"
			/>
			{RETURN_WELCOME_TIERS.map(({ tier, label }) => (
				<SettingsRow
					icon={icon(RETURN_ICON)}
					key={tier}
					label={label}
					onPress={() => setPreviewTier(tier)}
					variant="action"
				/>
			))}
			{FOLLOW_UP_TIERS.map(({ tier, label }, i) => (
				<SettingsRow
					icon={icon(FOLLOW_UP_ICON)}
					key={tier}
					label={label}
					onPress={() => seedFollowUp(tier)}
					variant="action"
				/>
			))}

			<SettingsRow
				icon={icon(INTAKE_ICON)}
				label="Replay intake"
				onPress={replayIntake}
				variant="action"
			/>

			<StarterSuggestionsDevRows />

			<SettingsRow
				icon={icon(SENTRY_ICON)}
				isLast
				label="Send Sentry test error"
				onPress={() => Sentry.captureException(new Error("Sentry test error"))}
				variant="action"
			/>

			<ReturnWelcomeSheet
				isOpen={previewTier !== null}
				onClose={() => setPreviewTier(null)}
				tier={previewTier ?? "recent"}
			/>
		</SettingsSection>
	);
};
