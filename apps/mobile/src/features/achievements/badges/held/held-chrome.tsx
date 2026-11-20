import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import type { BadgeView } from "@/features/achievements/badges/badges-model";
import { TOP } from "@/features/achievements/badges/held/held-words";
import { Part, Reveal } from "@/features/achievements/badges/held/reveal";
import { type Pose, RV } from "@/features/achievements/coin/pose";
import { COPY } from "@/features/achievements/copy";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const CHEVRON: IconName = { android: "arrow_back", ios: "chevron.left" };
const SHARE: IconName = { android: "ios_share", ios: "square.and.arrow.up" };
const GLYPH = 17;

export function HeldChrome({
	pose,
	badge,
	dy,
	onBack,
	onPin,
	onShare,
}: {
	pose: SharedValue<Pose>;
	badge: BadgeView | undefined;
	dy: number;
	onBack: () => void;
	onPin: () => void;
	onShare: () => void;
}) {
	const insets = useSafeAreaInsets();
	const foreground = useTokenColor("foreground");
	const earned = badge?.earnedAt !== undefined;
	const pinned = badge?.pinned === true;
	const top = { top: TOP.chrome + dy };
	return (
		<>
			<Part on={earned}>
				<Reveal
					className="inset-x-6"
					i={RV.share}
					pose={pose}
					style={{ bottom: insets.bottom }}
				>
					<PressScale
						accessibilityLabel={COPY.badge.share}
						haptic={playSoftPress}
						onPress={onShare}
					>
						<GlassGroup className="h-13 justify-center gap-2 rounded-[26px]">
							<Icon
								color={foreground}
								name={SHARE}
								size={GLYPH}
								weight="semibold"
							/>
							<AppText
								className="text-[16px] leading-5"
								variant="body"
								weight="semibold"
							>
								{COPY.badge.share}
							</AppText>
						</GlassGroup>
					</PressScale>
				</Reveal>
			</Part>
			<Reveal className="left-4" i={RV.chrome} pose={pose} style={top}>
				<GlassGroup className="p-0">
					<PressScale
						accessibilityLabel={COPY.badge.back}
						className="size-11 items-center justify-center"
						onPress={onBack}
					>
						<Icon
							color={foreground}
							name={CHEVRON}
							size={GLYPH}
							weight="semibold"
						/>
					</PressScale>
				</GlassGroup>
			</Reveal>
			<Part on={earned}>
				<Reveal className="right-4" i={RV.chrome} pose={pose} style={top}>
					<PressScale
						accessibilityHint={
							pinned ? COPY.badge.unpinHint : COPY.badge.pinHint
						}
						accessibilityLabel={pinned ? COPY.badge.pinned : COPY.badge.pin}
						accessibilityState={{ selected: pinned }}
						onPress={onPin}
					>
						<GlassGroup className="h-11 rounded-[22px] px-4.5 py-0">
							<AppText
								className={cn("text-[15px] leading-5", pinned && "text-accent")}
								variant="body"
								weight="semibold"
							>
								{pinned ? COPY.badge.pinned : COPY.badge.pin}
							</AppText>
						</GlassGroup>
					</PressScale>
				</Reveal>
			</Part>
		</>
	);
}
