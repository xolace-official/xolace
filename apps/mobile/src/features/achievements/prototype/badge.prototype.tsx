// PROTOTYPE (#684), throwaway: never merge.
import {
	Canvas,
	ColorMatrix,
	Image as SkiaImage,
	useImage,
} from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useThemeColor } from "heroui-native";
import type { Achievement } from "./catalog.prototype";

/** Luminance greyscale, then flattened and pulled toward a mid-dark grey so the
 * rim and subject stay readable but clearly unlit (Reddit's locked look). */
const L = [0.2126, 0.7152, 0.0722];
const CONTRAST = 0.45;
const LIFT = 0.12;
const EMBOSS = [
	...L.map((c) => c * CONTRAST),
	0,
	LIFT,
	...L.map((c) => c * CONTRAST),
	0,
	LIFT,
	...L.map((c) => c * CONTRAST),
	0,
	LIFT,
	0,
	0,
	0,
	1,
	0,
];

type Props = {
	item: Achievement;
	size: number;
	/** "tint" = expo-image tintColor silhouette (a flat disc on a round badge);
	 * "dim" = the real art faded by opacity;
	 * "emboss" = the real art drawn greyscale and low-contrast through Skia. */
	locked?: "tint" | "dim" | "emboss";
};

/** One medallion. Locked badges keep their shape so the shelf reads as slots. */
export function Badge({ item, size, locked = "tint" }: Props) {
	const muted = useThemeColor("muted") as string;
	const isLocked = !item.earnedAt;
	if (isLocked && locked === "emboss") {
		return <EmbossedBadge item={item} size={size} />;
	}
	return (
		<Image
			accessibilityLabel={`${item.title}${isLocked ? ", locked" : ""}`}
			contentFit="contain"
			source={item.art}
			style={{
				height: size,
				opacity: isLocked ? (locked === "tint" ? 0.28 : 0.4) : 1,
				width: size,
			}}
			tintColor={isLocked && locked === "tint" ? muted : undefined}
		/>
	);
}

function EmbossedBadge({ item, size }: { item: Achievement; size: number }) {
	const image = useImage(item.art);
	return (
		<Canvas
			accessibilityLabel={`${item.title}, locked`}
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
					<ColorMatrix matrix={EMBOSS} />
				</SkiaImage>
			) : null}
		</Canvas>
	);
}
