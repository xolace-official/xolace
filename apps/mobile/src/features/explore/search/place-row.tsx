import { Image } from "expo-image";
import { MediaRow } from "@/components/shared/media-row";
import { SEARCH } from "@/features/explore/copy";
import type { Place } from "@/features/explore/search/search-data";
import { playSoftPress } from "@/lib/haptics";
import { imageSource } from "@/lib/image-source";

const COVER = { height: "100%", width: "100%" } as const;

export function PlaceRow({
	place,
	onOpen,
}: {
	place: Place;
	onOpen: () => void;
}) {
	return (
		<MediaRow
			className="mx-gutter"
			cover={
				place.imageUrl ? (
					<Image source={imageSource(place.imageUrl)} style={COVER} />
				) : null
			}
			haptic={playSoftPress}
			onPress={onOpen}
			sub={SEARCH.place[place.kind]}
			title={place.title}
		/>
	);
}
