// Settings → Mirror → Talk (#603): the companion's voice, pace and
// directness. Each applies from the next talk.
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SettingsSection } from "@/components/shared/settings-section";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { TalkChips } from "@/features/talk/talk-chips";
import { TalkVoicePicker } from "@/features/talk/talk-voice-picker";
import { useCompanionName } from "@/features/talk/use-companion-name";
import { useTalkStyle } from "@/features/talk/use-talk-style";

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<View className="gap-2.5 px-5 py-3">
			<AppText className="font-medium text-base text-foreground">
				{label}
			</AppText>
			{children}
		</View>
	);
}

export function TalkStyleSection() {
	const { isPlus } = usePlusEntitlement();
	const name = useCompanionName();
	const { pace, directness, setPace, setDirectness } = useTalkStyle();
	// Talks are Plus only; nothing here to set without them.
	if (!isPlus) {
		return null;
	}
	return (
		<SettingsSection title="Talk">
			<Row label="Voice">
				<TalkVoicePicker />
			</Row>
			<Row label="Pace">
				<TalkChips
					onPress={setPace}
					options={[
						{ label: "Slower", value: "slower" },
						{ label: "Normal", value: "normal" },
					]}
					value={pace}
				/>
			</Row>
			<Row label="Directness">
				<TalkChips
					onPress={setDirectness}
					options={[
						{ label: "Gentle", value: "gentle" },
						{ label: "In between", value: "balanced" },
						{ label: "Straight", value: "straight" },
					]}
					value={directness}
				/>
			</Row>
			<AppText className="px-5 pt-1 text-muted text-xs">
				{`Changes apply from your next talk. You can also ask ${name} to slow down mid-talk.`}
			</AppText>
		</SettingsSection>
	);
}
