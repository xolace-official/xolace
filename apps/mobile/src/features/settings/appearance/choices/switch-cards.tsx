import { Rows, SettingsCard } from "@/components/settings-kit/parts";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import { APPEARANCE_COPY as C } from "@/features/settings/appearance/copy";
import { SettingsSwitchRow } from "@/features/settings/settings-switch-row";

/** Night mode (10pm–4am): this device's setting. */
export function NightCard() {
	const { state, actions } = useAppearanceScreen();
	return (
		<SettingsCard>
			<SettingsSwitchRow
				a11y={C.nightA11y}
				label={C.nightRow}
				onChange={actions.setNightMode}
				value={state.nightMode}
			/>
		</SettingsCard>
	);
}

/** The You cards a person can take off their profile, kept on the account (B7). */
export function ProfileCardsCard() {
	const { state, actions } = useAppearanceScreen();
	return (
		<SettingsCard>
			<Rows>
				{state.profileCards.map((card) => (
					<SettingsSwitchRow
						key={card.id}
						label={card.label}
						onChange={(show) => actions.showProfileCard(card.id, show)}
						value={card.shown}
					/>
				))}
			</Rows>
		</SettingsCard>
	);
}
