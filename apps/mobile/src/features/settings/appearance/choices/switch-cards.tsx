import { Rows, SettingsCard } from "@/components/settings-kit/parts";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import { APPEARANCE_COPY as C } from "@/features/settings/appearance/copy";
import { SettingsSwitchRow } from "@/features/settings/settings-switch-row";

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
