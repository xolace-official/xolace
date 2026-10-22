import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { useAppStore, type ProfileCardId } from "@/src/store/store";

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
      <View className="mx-5 rounded-2xl bg-surface overflow-hidden">
        {CARDS.map((card, i) => (
          <SettingsRow
            key={card.id}
            variant="toggle"
            label={card.label}
            isSelected={!hidden.includes(card.id)}
            onToggle={() => toggle(card.id)}
            isLast={i === CARDS.length - 1}
          />
        ))}
      </View>
      <AppText className="text-xs text-foreground/30 leading-5 px-5 pt-3">
        Hiding a card only takes it off your profile. Nothing else changes.
      </AppText>
    </SettingsSection>
  );
}
