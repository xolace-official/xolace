import { useEffect } from "react";
import { View } from "react-native";
import { useHeaderScrollY } from "react-native-collapsible-tab";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { Aura } from "@/components/shared/aura";
import { COPY } from "@/features/you/copy";
import { BadgesRow } from "@/features/you/home/badges/badges-row";
import { AvatarButton } from "@/features/you/home/header/avatar-button";
import { TopBar } from "@/features/you/home/header/top-bar";
import { useCollapseFollowsRange } from "@/features/you/home/header/use-collapse-follows-range";
import { StreakCard } from "@/features/you/home/streak/streak-card";
import { useYouHome } from "@/features/you/home/you-data";
import { useYouUi } from "@/features/you/home/you-ui";
import { useTokenColors } from "@/lib/use-token-color";

const SCROLL_STEP = 4;
const WARM_DRIFT_MS = 14_000;
const COOL_DRIFT_MS = 16_000;
const COOL_DRIFT_X = -12;
const AURA_TOKENS = ["you-aura-warm", "you-aura-cool"] as const;

export function YouHeader({ topBarHeight }: { topBarHeight: number }) {
	const { hero } = useYouHome().state;
	const { tip, closeTip } = useYouUi();
	const tipOpen = useSharedValue(tip.open);
	useEffect(() => {
		tipOpen.set(tip.open);
	}, [tip.open, tipOpen]);
	const collapse = useHeaderScrollY();
	useCollapseFollowsRange();
	const [warm = "", cool = ""] = useTokenColors(AURA_TOKENS);

	useAnimatedReaction(
		() => Math.round(collapse.get() / SCROLL_STEP),
		(now, before) => {
			if (tipOpen.get() && before !== null && now !== before) {
				scheduleOnRN(closeTip);
			}
		}
	);

	return (
		// Not flattened: the top bar's zIndex (over the streak card) must stay inside the header,
		// under the tab bar that follows it.
		<View
			className="items-center px-5 pt-safe-offset-[42px] pb-4.5"
			collapsable={false}
		>
			<Aura
				driftMs={WARM_DRIFT_MS}
				height={360}
				stops={[
					{ color: warm, offset: 0, opacity: 0.3 },
					{ color: warm, offset: 1, opacity: 0 },
				]}
				style={{ left: -120, top: -80 }}
				width={460}
			/>
			<Aura
				driftMs={COOL_DRIFT_MS}
				driftX={COOL_DRIFT_X}
				height={330}
				stops={[
					{ color: cool, offset: 0, opacity: 0.26 },
					{ color: cool, offset: 1, opacity: 0 },
				]}
				style={{ right: -150, top: -100 }}
				width={420}
			/>

			<AvatarButton />

			{hero ? (
				<>
					<AppText
						accessibilityRole="header"
						className="mt-4 text-[27px] leading-8 tracking-[-0.54px]"
						variant="headline"
					>
						{hero.greeting}
					</AppText>
					{hero.isNew ? (
						<AppText
							center
							className="mt-2 px-6 text-[15px] leading-[22.5px]"
							color="muted"
							variant="callout"
						>
							{COPY.hero.fresh}
						</AppText>
					) : hero.since ? (
						<AppText
							className="mt-1.25 text-[15px] leading-5"
							color="muted"
							variant="callout"
						>
							{hero.since}
						</AppText>
					) : null}
				</>
			) : (
				<View className="h-[57px]" />
			)}

			<StreakCard />
			<BadgesRow />

			<TopBar height={topBarHeight} />
		</View>
	);
}
