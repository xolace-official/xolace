// Settings → Mirror → Talk (#603): the companion's voice, pace and
// directness. Each applies from the next talk.
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { useCompanionName } from "./use-companion-name";
import { TalkChips } from "./talk-chips";
import { TalkVoicePicker } from "./talk-voice-picker";
import { useTalkStyle } from "./use-talk-style";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5 px-5 py-3">
      <AppText className="text-base font-medium text-foreground">{label}</AppText>
      {children}
    </View>
  );
}

export function TalkStyleSection() {
  const { isPlus } = usePlusEntitlement();
  const name = useCompanionName();
  const { pace, directness, setPace, setDirectness } = useTalkStyle();
  // Talks are Plus only; nothing here to set without them.
  if (!isPlus) return null;
  return (
    <SettingsSection title="Talk">
      <Row label="Voice">
        <TalkVoicePicker />
      </Row>
      <Row label="Pace">
        <TalkChips
          value={pace}
          onPress={setPace}
          options={[
            { value: "slower", label: "Slower" },
            { value: "normal", label: "Normal" },
          ]}
        />
      </Row>
      <Row label="Directness">
        <TalkChips
          value={directness}
          onPress={setDirectness}
          options={[
            { value: "gentle", label: "Gentle" },
            { value: "balanced", label: "In between" },
            { value: "straight", label: "Straight" },
          ]}
        />
      </Row>
      <AppText className="px-5 pt-1 text-xs text-muted">
        {`Changes apply from your next talk. You can also ask ${name} to slow down mid-talk.`}
      </AppText>
    </SettingsSection>
  );
}
