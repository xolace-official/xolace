import {
	Canvas,
	Group,
	Image as SkiaImage,
	useImage,
} from "@shopify/react-native-skia";
import { useThemeColor } from "heroui-native";
import { Platform, View, type ViewStyle } from "react-native";

import { cn } from "@/lib/utils";

import { createFounderClipPath } from "./clip-paths";
import type { FounderMarqueeCard } from "./marquee-data";

// A tinted frame (plain RN view, so the colour stays a theme token) with a
// Skia-clipped photo inset. Only Skia can do the non-rectangular silhouettes.

const INSET = 14;

type Props = {
	card: FounderMarqueeCard;
	width: number;
	height: number;
	rotationDeg?: number;
};

export const FounderCard = ({
	card,
	width,
	height,
	rotationDeg = 0,
}: Props) => {
	const skImage = useImage(card.image);
	const shadowColor = useThemeColor("foreground") as string;
	const innerW = width - INSET * 2;
	const innerH = height - INSET * 2;
	const clip = createFounderClipPath(card.shape, innerW, innerH);

	const shadow: ViewStyle =
		Platform.select<ViewStyle>({
			android: { elevation: 10 },
			default: {},
			ios: {
				shadowColor,
				shadowOffset: { height: 12, width: -10 },
				shadowOpacity: 0.35,
				shadowRadius: 16,
			},
		}) ?? {};

	return (
		<View
			className={cn("rounded-3xl", card.frameClassName)}
			style={{
				height,
				transform: [{ rotate: `${rotationDeg}deg` }],
				width,
				...shadow,
			}}
		>
			<Canvas
				style={{
					height: innerH,
					marginLeft: INSET,
					marginTop: INSET,
					width: innerW,
				}}
			>
				<Group clip={clip}>
					{skImage ? (
						<SkiaImage
							fit="cover"
							height={innerH}
							image={skImage}
							width={innerW}
							x={0}
							y={0}
						/>
					) : null}
				</Group>
			</Canvas>
		</View>
	);
};
