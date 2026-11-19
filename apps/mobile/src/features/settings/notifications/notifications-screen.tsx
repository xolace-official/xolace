import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import {
	Footnote,
	Hairline,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { BlockedBanner } from "@/features/settings/notifications/blocked/blocked-banner";
import {
	NOTIFY_COPY as C,
	NOTIFY_ICONS,
} from "@/features/settings/notifications/copy";
import { LockCard } from "@/features/settings/notifications/lock/lock-card";
import { useNotificationsScreen } from "@/features/settings/notifications/notifications-data";
import {
	lockSample,
	quietNote,
	reachOf,
} from "@/features/settings/notifications/notifications-model";
import {
	type QuietEnd,
	QuietHours,
} from "@/features/settings/notifications/quiet/quiet-hours";
import { ReachPills } from "@/features/settings/notifications/reach/reach-pills";
import { SettingsSwitchRow } from "@/features/settings/settings-switch-row";

function Section({
	title,
	note,
	children,
}: {
	title: string;
	note?: string;
	children: ReactNode;
}) {
	return (
		<View className="mt-7">
			<SectionTitle>{title}</SectionTitle>
			{children}
			{note ? <Footnote>{note}</Footnote> : null}
		</View>
	);
}

/**
 * Settings › Notifications (board "Notifications v2", P/design/handoff/settings.md): a lock-screen
 * sample in the chosen voice, held when quiet hours would hold it; reach as three pills; quiet
 * hours as a day bar and two rows that open inline; a banner when the phone blocks notifications.
 * Nothing animates in.
 */
export function NotificationsScreen({
	initialOpen = null,
}: {
	/** Which quiet-hours row starts open (a dev state). */
	initialOpen?: QuietEnd | null;
}) {
	const { state, actions } = useNotificationsScreen();
	const reach = reachOf(state.reach);
	return (
		<>
			<ScrollView
				className="bg-background"
				contentContainerClassName="pt-1 pb-10"
				contentInsetAdjustmentBehavior="automatic"
			>
				{state.blocked ? (
					<BlockedBanner onOpenSettings={actions.openSettings} />
				) : null}
				<LockCard sample={lockSample(state)} />
				<Section note={C.remindersNote} title={C.reminders}>
					<SettingsCard>
						<SettingsSwitchRow
							disabled={state.blocked}
							label={C.remindersRow}
							onChange={actions.setReminders}
							value={state.reminders}
						/>
					</SettingsCard>
				</Section>
				{state.reachMeOn ? (
					<Section title={C.checkIns}>
						<SettingsCard>
							<TileRow
								icon={NOTIFY_ICONS.reachMeOn}
								label={C.reachRow}
								last
								onPress={actions.openReachMeOn}
								value={state.reachMeOn.value}
							/>
						</SettingsCard>
					</Section>
				) : null}
				{state.reminders ? (
					<>
						<Section note={reach.desc} title={C.reach}>
							<ReachPills onPick={actions.setReach} value={state.reach} />
						</Section>
						<Section note={quietNote(state.quiet)} title={C.quiet}>
							<SettingsCard>
								<View>
									<SettingsSwitchRow
										label={C.quiet}
										onChange={actions.setQuiet}
										value={state.quiet !== null}
									/>
									{state.quiet ? <Hairline /> : null}
								</View>
								{state.quiet ? (
									<QuietHours
										initialOpen={initialOpen}
										onPick={actions.setQuietHour}
										quiet={state.quiet}
									/>
								) : null}
							</SettingsCard>
						</Section>
					</>
				) : null}
				<Section note={C.chatNote} title={C.conversations}>
					<SettingsCard>
						<SettingsSwitchRow
							disabled={state.blocked}
							label={C.chatRow}
							onChange={actions.setChat}
							value={state.chat}
						/>
					</SettingsCard>
				</Section>
				<Section note={C.lettersNote} title={C.letters}>
					<SettingsCard>
						<SettingsSwitchRow
							disabled={state.blocked || state.letters === null}
							label={C.lettersRow}
							onChange={actions.setLetters}
							value={state.letters ?? false}
						/>
					</SettingsCard>
				</Section>
			</ScrollView>
			{/* The OS has stopped asking: the switch stays put and this points at Settings. */}
			<ConfirmationDialog
				confirmLabel={C.alert.ok}
				description={C.alert.body}
				isOpen={state.alertOpen}
				onConfirm={actions.openSettings}
				onOpenChange={(open) => {
					if (!open) {
						actions.closeAlert();
					}
				}}
				title={C.alert.title}
			/>
		</>
	);
}
