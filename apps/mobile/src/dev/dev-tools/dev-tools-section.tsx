/**
 * Account › Dev tools (dev builds only): production's rows on the settings kit. The Account
 * route reaches this file only through `__DEV__ ? require(...) : null`, so release builds
 * drop it. Rows marked "Delete with features/<name>" open an old feature's piece: the screen
 * PR that deletes that folder deletes the row with it.
 */
import { useState } from "react";
import { View } from "react-native";
import {
	Rows,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import type { IconName } from "@/components/shared/icon";
import { type FollowUpTier, useDevTools } from "@/dev/dev-tools/use-dev-tools";
// Delete with features/reflect.
import { ReturnWelcomeSheet } from "@/features/reflect/components/return-welcome-sheet";
import type { ReturnWelcomeTier } from "@/features/reflect/return-welcome-copy";

const I = {
	age: { android: "cake", ios: "birthday.cake" },
	awareness: { android: "event_repeat", ios: "calendar.badge.clock" },
	badge: { android: "military_tech", ios: "medal" },
	bump: { android: "local_fire_department", ios: "flame" },
	deferred: { android: "quiz", ios: "questionmark.bubble" },
	followUp: { android: "notifications_active", ios: "bell.badge" },
	intake: { android: "restart_alt", ios: "figure.walk.arrival" },
	map: { android: "map", ios: "map" },
	plus: { android: "workspace_premium", ios: "sparkles" },
	replay: { android: "replay", ios: "play.circle" },
	reset: { android: "restart_alt", ios: "arrow.counterclockwise" },
	returnWelcome: { android: "waving_hand", ios: "hand.wave" },
	sentry: { android: "bug_report", ios: "ant.circle" },
	states: { android: "view_carousel", ios: "rectangle.stack" },
} as const satisfies Record<string, IconName>;

const FOLLOW_UP_TIERS: readonly FollowUpTier[] = [
	"standard",
	"elevated",
	"acute",
];

const RETURN_WELCOME_TIERS: readonly {
	tier: ReturnWelcomeTier;
	label: string;
}[] = [
	{ label: "recent", tier: "recent" },
	{ label: "14–30d", tier: "away-14-30" },
	{ label: "30–90d", tier: "away-30-90" },
	{ label: "90d+", tier: "away-90-plus" },
	{ label: "anniversary", tier: "anniversary" },
];

/** @public Reached only through the Account route's `__DEV__` require, which knip can't follow. */
export function DevToolsSection() {
	const dev = useDevTools();
	const [previewTier, setPreviewTier] = useState<ReturnWelcomeTier | null>(
		null
	);
	return (
		<View>
			<SectionTitle>Dev tools</SectionTitle>
			<SettingsCard>
				<Rows>
					<TileRow
						icon={I.states}
						label="Dev states"
						onPress={dev.openDevStates}
					/>
					<TileRow
						icon={I.bump}
						label="Bump streak +1"
						onPress={() => dev.runStreak("bump")}
					/>
					<TileRow
						icon={I.reset}
						label="Reset streak to day 1"
						onPress={() => dev.runStreak("reset")}
					/>
					<TileRow
						icon={I.replay}
						label="Replay streak reveal"
						onPress={dev.replayReveal}
					/>
					<TileRow
						icon={I.awareness}
						label="Reset awareness events"
						onPress={dev.resetAwareness}
					/>
					{/* Delete with features/reflect. */}
					{RETURN_WELCOME_TIERS.map(({ tier, label }) => (
						<TileRow
							icon={I.returnWelcome}
							key={tier}
							label={`Return welcome · ${label}`}
							onPress={() => setPreviewTier(tier)}
						/>
					))}
					{FOLLOW_UP_TIERS.map((tier) => (
						<TileRow
							icon={I.followUp}
							key={tier}
							label={`Seed follow-up · ${tier}`}
							onPress={() => dev.seedFollowUp(tier)}
						/>
					))}
					<TileRow
						icon={I.intake}
						label="Replay intake"
						onPress={dev.replayIntake}
					/>
					<TileRow
						icon={I.deferred}
						label="Replay deferred questions"
						onPress={dev.replayDeferred}
					/>
					{/* Delete with features/xolacer-chat. */}
					<TileRow
						icon={I.age}
						label="Clear date of birth"
						onPress={dev.clearAgeGate}
					/>
					{/* Delete with features/intake. */}
					<TileRow
						icon={I.plus}
						label="Preview Xolace+ step"
						onPress={dev.previewPlusStep}
					/>
					{/* Delete with features/starter-suggestions. */}
					<TileRow
						icon={I.map}
						label="Starter suggestions · as new user"
						onPress={() => dev.armStarters(true)}
					/>
					{/* Delete with features/starter-suggestions. */}
					<TileRow
						icon={I.map}
						label="Starter suggestions · real gate"
						onPress={() => dev.armStarters(false)}
					/>
					<TileRow
						icon={I.badge}
						label="Replay badge unlock"
						onPress={dev.replayBadge}
					/>
					<TileRow
						icon={I.sentry}
						label="Send Sentry test error"
						onPress={dev.sentryTest}
					/>
				</Rows>
			</SettingsCard>
			<ReturnWelcomeSheet
				isOpen={previewTier !== null}
				onClose={() => setPreviewTier(null)}
				tier={previewTier ?? "recent"}
			/>
		</View>
	);
}
