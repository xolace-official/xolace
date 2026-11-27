import { CoverImage } from "@/components/shared/cover-image";
import { MediaRow } from "@/components/shared/media-row";
import type { TrackItem } from "@/features/explore/search/search-data";
import { trackSubtitle } from "@/features/explore/search/search-model";

const COVER = { height: "100%", width: "100%" } as const;

export function TrackRow({
	track,
	locked,
	onOpen,
}: {
	track: TrackItem;
	locked: boolean;
	onOpen: () => void;
}) {
	return (
		<MediaRow
			className="mx-gutter"
			cover={
				<CoverImage
					recyclingKey={track._id}
					style={COVER}
					thumbhash={track.thumbhash}
					uri={track.thumbUrl}
				/>
			}
			locked={locked}
			onPress={onOpen}
			sub={trackSubtitle(track)}
			title={track.title}
		/>
	);
}
