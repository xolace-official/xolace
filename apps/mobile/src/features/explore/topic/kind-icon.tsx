import { Icon } from "@/components/shared/icon";
import { TOPIC } from "@/features/explore/explore-style";
import { useTokenColors } from "@/lib/use-token-color";

/**
 * Production's glyph on a topic's track rows: 16 pt `waveform` (spoken) or `music.note`, in the
 * Support audio and Music doors' colours. Hidden from VoiceOver; the row's label says the kind.
 */
export function KindIcon({ music }: { music: boolean }) {
	const [audio, tune] = useTokenColors([
		"browse-audio-foreground",
		"browse-music-foreground",
	]);
	return (
		<Icon
			color={music ? tune : audio}
			name={
				music
					? { android: "music_note", ios: "music.note" }
					: { android: "graphic_eq", ios: "waveform" }
			}
			size={TOPIC.kindIcon}
		/>
	);
}
