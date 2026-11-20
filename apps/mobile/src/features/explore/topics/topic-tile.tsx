import { Link } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { PressScale } from "@/components/shared/press-scale";
import { Bone } from "@/components/shared/skeleton";
import {
	countLine,
	type TopicTile as Tile,
} from "@/features/explore/explore-model";
import { GRID } from "@/features/explore/explore-style";
import { canAppleZoom } from "@/lib/apple-zoom";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/**
 * A square cover (22 pt corners, a half-point edge), then the name and the count line. It zooms
 * into the topic's cover; with Reduce Motion it's a plain push.
 */
export function TopicTile({ tile, size }: { tile: Tile; size: number }) {
	const reduced = useEffectiveReducedMotion();
	const counts = countLine(tile);
	const box = { borderRadius: GRID.artR, height: size, width: size };
	return (
		<Link
			asChild
			href={{ params: { slug: tile.slug }, pathname: "/explore/topic/[slug]" }}
		>
			<Link.Trigger withAppleZoom={!reduced && canAppleZoom()}>
				<PressScale
					accessibilityLabel={`${tile.title}, ${counts}`}
					accessibilityRole="link"
					haptic={playSoftPress}
					scaleTo={GRID.press}
					style={{ gap: GRID.textGap, width: size }}
				>
					<View
						className="overflow-hidden border-continuous bg-surface-secondary"
						style={box}
					>
						<CoverImage
							recyclingKey={tile.slug}
							style={box}
							thumbhash={tile.thumbhash}
							uri={tile.thumbUrl}
						/>
						<View
							className="absolute inset-0 border-[0.5px] border-continuous border-foreground/6"
							pointerEvents="none"
							style={{ borderRadius: GRID.artR }}
						/>
					</View>
					<View className="gap-px">
						<AppText
							className="leading-[19px]"
							numberOfLines={1}
							variant="callout"
							weight="semibold"
						>
							{tile.title}
						</AppText>
						<AppText
							className="leading-[17px]"
							color="muted"
							numberOfLines={1}
							variant="footnote"
						>
							{counts}
						</AppText>
					</View>
				</PressScale>
			</Link.Trigger>
		</Link>
	);
}

/** A tile while the grid loads, in the shared look: the cover and two lines, in place. The grid
 * breathes them together (`topics-screen`). */
export function TileSkeleton({ size }: { size: number }) {
	return (
		<View style={{ gap: GRID.textGap, width: size }}>
			<Bone h={size} r={GRID.artR} w={size} />
			<View className="gap-1.5">
				<Bone h={15} r={4} w="75%" />
				<Bone h={13} r={4} w="50%" />
			</View>
		</View>
	);
}
