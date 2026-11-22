import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { CoverImage } from "@/components/shared/cover-image";
import { MediaRow } from "@/components/shared/media-row";
import {
	type BrowseFrom,
	useOpenTrack,
} from "@/features/browse/use-open-track";

export type { BrowseFrom };
export type TrackItem = FunctionReturnType<
	typeof api.browse.topics.getTopic
>[number];

export const FAMILY_LABEL = {
	music: "Music",
	support: "Support audio",
} as const;

const COVER = { height: "100%", width: "100%" } as const;

export function TrackRow({
	track,
	from,
	onOpen,
}: {
	track: TrackItem;
	from: BrowseFrom;
	onOpen?: () => void;
}) {
	const { open, locked } = useOpenTrack(from);
	const subtitle =
		track.episodeNumber === undefined
			? track.attribution
			: `Episode ${track.episodeNumber}${track.attribution ? ` · ${track.attribution}` : ""}`;

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
			onPress={() => {
				onOpen?.();
				open(track);
			}}
			sub={subtitle}
			title={track.title}
		/>
	);
}
