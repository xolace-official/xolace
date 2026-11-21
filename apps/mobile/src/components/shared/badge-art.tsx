import {
	Canvas,
	ColorMatrix,
	Image as SkiaImage,
	useImage,
} from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { View } from "react-native";

const LUMA = [0.2126, 0.7152, 0.0722];
const CONTRAST = 0.45;
const LIFT = 0.12;
const GREY_ROW = [...LUMA.map((c) => c * CONTRAST), 0, LIFT];
const LOCKED_MATRIX = [...GREY_ROW, ...GREY_ROW, ...GREY_ROW, 0, 0, 0, 1, 0];
const FADE_IN_MS = 150;

type Props = {
	source: string | number | null;
	thumbhash?: string | null;
	lit: boolean;
	size: number;
	accessibilityLabel?: string;
	/** Fires once the lit art has drawn (a capture waits for it). */
	onLoad?: () => void;
	/** No fade-in, for a capture that must not catch it half-drawn. */
	instant?: boolean;
};

export function BadgeArt({
	source,
	thumbhash,
	lit,
	size,
	accessibilityLabel,
	onLoad,
	instant = false,
}: Props) {
	const box = { height: size, width: size };
	const a11y = accessibilityLabel
		? { accessibilityLabel, accessible: true }
		: { accessible: false };
	if (source === null) {
		return (
			<View
				{...a11y}
				className="rounded-full border border-separator bg-surface"
				style={box}
			/>
		);
	}
	if (lit) {
		return (
			<Image
				{...a11y}
				contentFit="contain"
				onLoad={onLoad}
				placeholder={thumbhash ? { thumbhash } : undefined}
				source={typeof source === "string" ? { uri: source } : source}
				style={box}
				transition={instant ? 0 : FADE_IN_MS}
			/>
		);
	}
	return <LockedArt a11y={a11y} size={size} source={source} />;
}

function LockedArt({
	a11y,
	size,
	source,
}: {
	a11y: { accessibilityLabel?: string; accessible: boolean };
	size: number;
	source: string | number;
}) {
	const image = useImage(source);
	return (
		<Canvas {...a11y} style={{ height: size, width: size }}>
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
