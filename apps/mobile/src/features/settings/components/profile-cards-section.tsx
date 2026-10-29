import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import { type ProfileCardId, useAppStore } from "@/store/store";

const CARDS: { id: ProfileCardId; label: string }[] = [
	{ id: "calendar", label: "Reflection calendar" },
	{ id: "rank", label: "Among the fires" },
	{ id: "week", label: "Week intensity" },
];

/** Lets the person take the numbers off their profile, for the weeks they sting. */
export function ProfileCardsSection() {
	const hidden = useAppStore((s) => s.hiddenProfileCards);
	const toggle = useAppStore((s) => s.toggleProfileCard);

	return (
		<SettingsSection title="Profile">
			<View className="mx-5 overflow-hidden rounded-2xl bg-surface">
				{CARDS.map((card, i) => (
					<SettingsRow
						isLast={i === CARDS.length - 1}
						isSelected={!hidden.includes(card.id)}
						key={card.id}
						label={card.label}
						onToggle={() => toggle(card.id)}
						variant="toggle"
					/>
				))}
			</View>
			<AppText className="px-5 pt-3 text-foreground/30 text-xs leading-5">
				Hiding a card only takes it off your profile. Nothing else changes.
			</AppText>
		</SettingsSection>
	);
}
