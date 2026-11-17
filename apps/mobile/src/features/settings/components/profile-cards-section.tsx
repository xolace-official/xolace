import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
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

/**
 * Lets the person take the numbers off their profile, for the weeks they sting. Kept on the
 * account (`preferences.profileCards`, B7); a card still hidden only on this device (before
 * B7, which You uploads) counts as hidden too, and showing it clears both.
 */
export function ProfileCardsSection() {
	const server = useQuery(api.preferences.profileCards.getHidden);
	const device = useAppStore((s) => s.hiddenProfileCards);
	const forget = useAppStore((s) => s.toggleProfileCard);
	const setHidden = useMutation(api.preferences.profileCards.setHidden);
	const hidden = [...(server ?? []), ...device];

	const toggle = (id: ProfileCardId) => {
		const hide = !hidden.includes(id);
		if (device.includes(id)) {
			forget(id);
		}
		setHidden({ card: id, hidden: hide }).catch(() => undefined);
	};

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
