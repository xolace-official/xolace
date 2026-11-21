import { Icon } from "@/components/shared/icon";
import { TOPIC } from "@/features/explore/explore-style";
import { useTokenColors } from "@/lib/use-token-color";

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
