// The companion's voice from the Plus cast, with previews (#603): on the
// consent card and in settings. Picking a voice plays it.

import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useVoicePreview } from "@/src/features/settings/hooks/use-voice-preview";
import { VOICE_OPTIONS } from "@/src/features/settings/voice-options";
import { TalkChips } from "@/src/features/talk/talk-chips";
import { useTalkStyle } from "@/src/features/talk/use-talk-style";
import { playSoftPress } from "@/src/lib/haptics";

const CAST = VOICE_OPTIONS.filter(
	(o): o is typeof o & { value: VoiceSlug } => o.value !== "auto"
);

export function TalkVoicePicker() {
	const { voice, setVoice } = useTalkStyle();
	const preview = useVoicePreview();
	const accent = useThemeColor("accent");
	const muted = useThemeColor("muted");
	return (
		<TalkChips
			onPress={(slug) => {
				playSoftPress();
				if (slug !== voice) {
					setVoice(slug);
				}
				preview.toggle(slug);
			}}
			options={CAST.map((o) => ({
				accessory: (
					<SymbolView
						name={
							preview.playingSlug === o.value
								? { android: "stop", ios: "stop.fill", web: "stop" }
								: { android: "play_arrow", ios: "play.fill", web: "play_arrow" }
						}
						size={11}
						tintColor={o.value === voice ? accent : muted}
					/>
				),
				hint:
					preview.playingSlug === o.value
						? "Stops the preview"
						: "Picks this voice and plays a preview",
				label: o.label,
				value: o.value,
			}))}
			value={voice}
		/>
	);
}
