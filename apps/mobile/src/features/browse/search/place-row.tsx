/**
 * A Hubs & topics result in Browse search (#550): a Lantern hub or a Browse
 * topic, laid out like a TrackRow so the sections read as one list. A tap opens
 * that screen — neither is Plus-gated, so there's no lock.
 */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";
import { imageSource } from "@/lib/image-source";

type Place = FunctionReturnType<typeof api.library.search.searchPlaces>[number];

const THUMB = 56;
const KIND_LABEL = { hub: "Lantern hub", topic: "Topic" } as const;

export function PlaceRow({
	place,
	onOpen,
}: {
	place: Place;
	onOpen?: () => void;
}) {
	const open = () => {
		playSoftPress();
		onOpen?.();
		if (place.kind === "hub") {
			router.push({
				params: { slug: place.slug },
				pathname: "/browse/library/hub/[slug]",
			});
		} else {
			router.push({
				params: { slug: place.slug },
				pathname: "/browse/topic/[slug]",
			});
		}
	};

	return (
		<Pressable
			accessibilityLabel={`${place.title}, ${KIND_LABEL[place.kind]}`}
			accessibilityRole="button"
			className="flex-row items-center gap-3 pl-4 active:opacity-60"
			onPress={open}
		>
			<View
				className="overflow-hidden rounded-lg bg-surface-tertiary"
				style={{ height: THUMB, width: THUMB }}
			>
				{place.imageUrl && (
					<Image
						source={imageSource(place.imageUrl)}
						style={{ height: THUMB, width: THUMB }}
					/>
				)}
			</View>
			<View
				className="flex-1 justify-center border-border/65 border-b py-3 pr-4"
				style={{ minHeight: THUMB + 12 }}
			>
				<AppText className="font-medium text-[16px]" numberOfLines={1}>
					{place.title}
				</AppText>
				<AppText className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
					{KIND_LABEL[place.kind]}
				</AppText>
			</View>
		</Pressable>
	);
}
