/** A Hubs & topics search result (#550), drawn as the kit's `MediaRow` like a TrackRow. Neither
 * is Plus-gated. */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MediaRow } from "@/components/shared/media-row";
import { playSoftPress } from "@/lib/haptics";
import { imageSource } from "@/lib/image-source";

type Place = FunctionReturnType<typeof api.library.search.searchPlaces>[number];

const COVER = { height: "100%", width: "100%" } as const;
const KIND_LABEL = { hub: "Lantern hub", topic: "Topic" } as const;

export function PlaceRow({
	place,
	onOpen,
}: {
	place: Place;
	onOpen?: () => void;
}) {
	const open = () => {
		onOpen?.();
		if (place.kind === "hub") {
			router.push({
				params: { slug: place.slug },
				pathname: "/explore/library/hub/[slug]",
			});
		} else {
			router.push({
				params: { slug: place.slug },
				pathname: "/explore/topic/[slug]",
			});
		}
	};

	return (
		<MediaRow
			className="mx-gutter"
			cover={
				place.imageUrl ? (
					<Image source={imageSource(place.imageUrl)} style={COVER} />
				) : null
			}
			haptic={playSoftPress}
			onPress={open}
			sub={KIND_LABEL[place.kind]}
			title={place.title}
		/>
	);
}
