import {
	Canvas,
	ColorMatrix,
	Image as SkiaImage,
	useImage,
} from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { View } from "react-native";
import type { AchievementView } from "./types";

// Luminance greyscale, flattened and lifted toward a mid grey (#684): the rim
// and subject stay readable but unlit, like Reddit's locked medallions.
const LUMA = [0.2126, 0.7152, 0.0722];
const CONTRAST = 0.45;
const LIFT = 0.12;
const GREY_ROW = [...LUMA.map((c) => c * CONTRAST), 0, LIFT];
const LOCKED_MATRIX = [...GREY_ROW, ...GREY_ROW, ...GREY_ROW, 0, 0, 0, 1, 0];

type Props = {
	achievement: Pick<AchievementView, "art" | "earnedAt" | "title">;
	size: number;
};

/** One medallion: the art in colour once earned, else drawn greyscale through Skia. */
export function Badge({ achievement, size }: Props) {
	const { art, earnedAt, title } = achievement;
	const earned = earnedAt !== undefined;
	// The fallback is the generic master, never this badge's own art: always unlit.
	const lit = earned && !art.fallback;
	const label = earned ? title : `${title}, locked`;
	const box = { height: size, width: size };

	if (!art.url) {
		// Not even the fallback is uploaded: an empty slot keeps the row's rhythm.
		return (
			<View
				accessibilityLabel={label}
				accessible
				className="rounded-full border border-separator bg-surface"
				style={box}
			/>
		);
	}
	if (lit) {
		return (
			<Image
				accessibilityLabel={label}
				contentFit="contain"
				placeholder={art.thumbhash ? { thumbhash: art.thumbhash } : undefined}
				source={{ uri: art.url }}
				style={box}
				transition={150}
			/>
		);
	}
	return <LockedBadge label={label} size={size} url={art.url} />;
}

function LockedBadge({
	label,
	size,
	url,
}: {
	label: string;
	size: number;
	url: string;
}) {
	const image = useImage(url);
	return (
		<Canvas
			accessibilityLabel={label}
			accessible
			style={{ height: size, width: size }}
		>
			{image ? (
				<SkiaImage
					fit="contain"
					height={size}
					image={image}
					width={size}
					x={0}
					y={0}
				>
					<ColorMatrix matrix={LOCKED_MATRIX} />
				</SkiaImage>
			) : null}
		</Canvas>
	);
}
