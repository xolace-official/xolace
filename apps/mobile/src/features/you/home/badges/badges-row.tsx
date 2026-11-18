import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { BadgeArt } from "@/components/shared/badge-art";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useYouHome } from "@/features/you/home/you-data";
import type { Medal } from "@/features/you/home/you-model";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const MED = 36;
const OVERLAP = 9;
/** The ring that cuts each medallion out of the one under it, in the card's colour. */
const RING = 2.5;
const STAGGER_MS = 40;
const FAN_FROM = 0.8;
const FAN_SPRING = { damping: 18, stiffness: 320 };

/** The badges row: the first three medallions stacked, pinned first; one badge is a star tile.
 * Opens Achievements. */
export function BadgesRow() {
	const { state, actions } = useYouHome();
	const [ember = "", subtle = ""] = useTokenColors(["ember", "subtle"]);
	const badges = state.badges;
	if (!badges) {
		return null;
	}
	return (
		<PressScale
			accessibilityLabel={badges.label}
			accessibilityRole="button"
			card
			className="mt-3 self-stretch"
			haptic={playSoftPress}
			onPress={actions.openBadges}
		>
			<Surface
				className="flex-row items-center gap-2.75 px-3.5 py-3"
				radius={20}
			>
				{badges.star ? (
					<View className="size-8 items-center justify-center rounded-[10px] border-continuous bg-ember-wash">
						<Icon
							color={ember}
							name={{ android: "star", ios: "star.fill" }}
							size={17}
						/>
					</View>
				) : (
					<View className="flex-row">
						{badges.medals.map((m, i) => (
							<Medallion
								index={i}
								key={m.id}
								medal={m}
								stack={badges.medals.length}
							/>
						))}
					</View>
				)}
				<View className="flex-1 gap-px">
					<AppText
						className="text-[14.5px] leading-[19px]"
						variant="callout"
						weight="semibold"
					>
						{badges.title}
					</AppText>
					<AppText
						className="text-[12.5px] leading-4"
						color="muted"
						variant="footnote"
					>
						{badges.sub}
					</AppText>
				</View>
				<Icon
					color={subtle}
					name={{ android: "chevron_right", ios: "chevron.right" }}
					size={14}
					weight="semibold"
				/>
			</Surface>
		</PressScale>
	);
}

/** One 36 pt medallion in its ring, fanning in 40 ms after the one before. */
function Medallion({
	medal,
	index,
	stack,
}: {
	medal: Medal;
	index: number;
	stack: number;
}) {
	const reduced = useEffectiveReducedMotion();
	return (
		<Animated.View
			className="items-center justify-center rounded-full bg-background"
			entering={
				reduced
					? undefined
					: ZoomIn.springify()
							.stiffness(FAN_SPRING.stiffness)
							.damping(FAN_SPRING.damping)
							.delay(index * STAGGER_MS)
							.withInitialValues({ transform: [{ scale: FAN_FROM }] })
							.reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
			}
			style={{
				height: MED + RING * 2,
				// 27 pt between centres: 36 pt discs overlapping by 9.
				marginLeft: index === 0 ? 0 : -(OVERLAP + RING * 2),
				padding: RING,
				width: MED + RING * 2,
				// The first on top (positive: a negative one slips under the glass card).
				zIndex: stack - index,
			}}
		>
			<BadgeArt
				lit={medal.lit}
				size={MED}
				source={medal.url}
				thumbhash={medal.thumbhash}
			/>
		</Animated.View>
	);
}
