import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BadgeArt } from "@/components/shared/badge-art";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { riseIn } from "@/design/entering";
import { useScheme } from "@/design/scheme";
import { CTA_H } from "@/features/achievements/arrival/arrival-chrome";
import type { ArrivalPlan } from "@/features/achievements/arrival/arrival-model";
import { COPY } from "@/features/achievements/copy";
import { playAffirmativePress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

type Backfill = Extract<ArrivalPlan, { kind: "backfill" }>;

const THUMB = 72;
const CLOSE_TOP = 56;
const BOARD_STATUS = 54;
const XMARK: IconName = { android: "close", ios: "xmark" };
const XMARK_SIZE = 15;
const AT = { cta: 860, eye: 300, grid: 450, line: 680, title: 600 } as const;

export function BackfillStage({
	plan,
	onClose,
	onSee,
}: {
	plan: Backfill;
	onClose: () => void;
	onSee: () => void;
}) {
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const dark = useScheme() === "dark";
	const foreground = useTokenColor("foreground");
	const ember = useTokenColor(dark ? "ember" : "ember-ink");
	const ctaBg = useTokenColor(dark ? "arrival-cta-dusk" : "foreground");
	const ctaInk = useTokenColor(dark ? "arrival-cta-ink-dusk" : "on-art");
	return (
		<View
			className="flex-1 bg-background px-6"
			style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
		>
			<View className="flex-1 items-center justify-center">
				<Animated.View entering={riseIn(AT.eye, reduced)}>
					<AppText
						center
						className="text-[12px] leading-4 tracking-[1.68px]"
						style={{ color: ember }}
						variant="caption"
						weight="bold"
					>
						{plan.firstSight
							? COPY.backfill.eyebrowFirst
							: COPY.backfill.eyebrowSince}
					</AppText>
				</Animated.View>
				<Animated.View
					className="my-8 flex-row flex-wrap justify-center gap-3"
					entering={riseIn(AT.grid, reduced)}
				>
					{plan.thumbnails.map((t) => (
						<BadgeArt
							key={t.id}
							lit={!t.art.unlit}
							size={THUMB}
							source={t.art.source}
							thumbhash={t.art.thumbhash}
						/>
					))}
				</Animated.View>
				<Animated.View entering={riseIn(AT.title, reduced)}>
					<AppText
						accessibilityRole="header"
						center
						className="text-[30px] leading-9 tracking-[-0.45px]"
						variant="title"
					>
						{COPY.backfill.title(plan.firstSight, plan.badges, plan.sparks)}
					</AppText>
				</Animated.View>
				{plan.firstSight ? (
					<Animated.View entering={riseIn(AT.line, reduced)}>
						<AppText
							center
							className="mt-3 text-[16px] text-foreground/70 leading-6"
							variant="body"
						>
							{COPY.backfill.line}
						</AppText>
					</Animated.View>
				) : null}
			</View>
			<Animated.View entering={riseIn(AT.cta, reduced)}>
				<PressScale
					className="items-center justify-center"
					haptic={playAffirmativePress}
					onPress={onSee}
					style={{
						backgroundColor: ctaBg,
						borderRadius: CTA_H / 2,
						height: CTA_H,
					}}
				>
					<AppText
						className="text-[17px] leading-[22px]"
						style={{ color: ctaInk }}
						variant="body"
						weight="semibold"
					>
						{COPY.backfill.cta}
					</AppText>
				</PressScale>
			</Animated.View>
			<View
				className="absolute right-4"
				style={{ top: CLOSE_TOP + insets.top - BOARD_STATUS }}
			>
				<GlassGroup className="p-0">
					<PressScale
						accessibilityLabel={COPY.arrival.close}
						className="size-11 items-center justify-center"
						onPress={onClose}
					>
						<Icon
							color={foreground}
							name={XMARK}
							size={XMARK_SIZE}
							weight="semibold"
						/>
					</PressScale>
				</GlassGroup>
			</View>
		</View>
	);
}
