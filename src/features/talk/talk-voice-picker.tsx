// The companion's voice from the Plus cast, with previews (#603): on the
// consent card and in settings. Picking a voice plays it.
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import type { VoiceSlug } from "@/convex/lib/voices";
import { VOICE_OPTIONS } from "@/src/features/settings/voice-options";
import { useVoicePreview } from "@/src/features/settings/hooks/use-voice-preview";
import { playSoftPress } from "@/src/lib/haptics";
import { TalkChips } from "./talk-chips";
import { useTalkStyle } from "./use-talk-style";

const CAST = VOICE_OPTIONS.filter((o): o is (typeof o & { value: VoiceSlug }) => o.value !== "auto");

export function TalkVoicePicker() {
  const { voice, setVoice } = useTalkStyle();
  const preview = useVoicePreview();
  const accent = useThemeColor("accent");
  const muted = useThemeColor("muted");
  return (
    <TalkChips
      value={voice}
      onPress={(slug) => {
        playSoftPress();
        if (slug !== voice) setVoice(slug);
        preview.toggle(slug);
      }}
      options={CAST.map((o) => ({
        value: o.value,
        label: o.label,
        hint: preview.playingSlug === o.value ? "Stops the preview" : "Picks this voice and plays a preview",
        accessory: (
          <SymbolView
            name={
              preview.playingSlug === o.value
                ? { ios: "stop.fill", android: "stop", web: "stop" }
                : { ios: "play.fill", android: "play_arrow", web: "play_arrow" }
            }
            size={11}
            tintColor={o.value === voice ? accent : muted}
          />
        ),
      }))}
    />
  );
}
