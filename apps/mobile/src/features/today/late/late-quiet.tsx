import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { CoverImage } from "@/components/shared/cover-image";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { RailTile } from "../rail/rail-model";
import { useToday } from "../today-data";

const ART = 52;
const PLAY = 16;

/** Something for the quiet (board's late `.qrow`): the rail's music, one tap into the player. */
export function LateQuiet({ tile }: { tile: RailTile }) {
	const accentInk = useTokenColor("accent-ink");
	const { state, actions } = useToday();
	const playing = state.playingSlug === tile.slug;
	return (
		<Card
			className="mt-3.5"
			label={`${tile.title}, ${tile.sub}${playing ? COPY.listen.playing : ""}`}
			onPress={() => actions.openTrack(tile)}
		>
			<View className="flex-row items-center gap-3.5 p-3">
				<View className="size-13 overflow-hidden rounded-[16px] border-continuous bg-surface-secondary">
					<CoverImage
						accessible={false}
						style={{ height: ART, width: ART }}
						thumbhash={tile.thumbhash}
						uri={tile.cover}
					/>
				</View>
				<View className="flex-1 gap-0.5">
					<AppText numberOfLines={2} variant="subhead" weight="semibold">
						{tile.title}
					</AppText>
					<AppText color="muted" variant="detail">
						{tile.sub}
					</AppText>
				</View>
				<View className="size-11 items-center justify-center rounded-full bg-accent-wash">
					<Icon
						color={accentInk}
						name={
							playing
								? { android: "pause", ios: "pause.fill" }
								: { android: "play_arrow", ios: "play.fill" }
						}
						size={PLAY}
					/>
				</View>
			</View>
		</Card>
	);
}
