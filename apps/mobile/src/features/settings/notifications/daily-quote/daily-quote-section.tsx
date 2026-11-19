import { View } from "react-native";
import {
	Footnote,
	Hairline,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { Segmented } from "@/components/shared/segmented";
import { NOTIFY_COPY as C } from "@/features/settings/notifications/copy";
import { useNotificationsScreen } from "@/features/settings/notifications/notifications-data";
import { DAILY_QUOTE_SLOTS } from "@/features/settings/notifications/notifications-model";
import { SettingsSwitchRow } from "@/features/settings/settings-switch-row";

const SLOT_OPTIONS = DAILY_QUOTE_SLOTS.map((id) => ({
	id,
	label: C.dailyQuoteSlots[id],
}));

/**
 * The daily quote push (B19): a switch, and while it's on, when in the day it comes. Says so when
 * the backoff paused it after quotes went unopened.
 */
export function DailyQuoteSection() {
	const { state, actions } = useNotificationsScreen();
	const { dailyQuote } = state;
	return (
		<View className="mt-7">
			<SectionTitle>{C.dailyQuote}</SectionTitle>
			<SettingsCard>
				<View>
					<SettingsSwitchRow
						disabled={state.blocked}
						label={C.dailyQuoteRow}
						onChange={actions.setDailyQuote}
						value={dailyQuote.on}
					/>
					{dailyQuote.on ? <Hairline /> : null}
				</View>
				{dailyQuote.on ? (
					<View className="px-4 py-3">
						<Segmented
							onChange={actions.setDailyQuoteSlot}
							options={SLOT_OPTIONS}
							value={dailyQuote.slot}
						/>
					</View>
				) : null}
			</SettingsCard>
			<Footnote>
				{dailyQuote.paused ? C.dailyQuotePaused : C.dailyQuoteNote}
			</Footnote>
		</View>
	);
}
