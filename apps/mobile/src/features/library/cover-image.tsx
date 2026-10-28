import { Image, type ImageProps } from "expo-image";
import { imageSource } from "@/lib/image-source";

type CoverImageProps = Omit<ImageProps, "source" | "placeholder"> & {
	uri?: string;
	thumbhash?: string;
};

/** Every Lantern cover renders through here. A `thumbhash` (#507) previews until the cover
 * loads. */
export function CoverImage({
	uri,
	thumbhash,
	contentFit = "cover",
	...props
}: CoverImageProps) {
	return uri ? (
		<Image
			contentFit={contentFit}
			placeholder={thumbhash ? { thumbhash } : undefined}
			placeholderContentFit={contentFit}
			source={imageSource(uri)}
			{...props}
		/>
	) : null;
}
