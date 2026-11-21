import { useState } from "react";
import { Pressable, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { COPY } from "@/features/lantern/copy";
import { useHomeScreen } from "@/features/lantern/home/home-data";
import { facetLabel, toggleIn } from "@/features/lantern/lantern-model";
import { LT } from "@/features/lantern/lantern-style";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const CHIP = { h: 38, padH: 15 } as const;
const CLOSE = { android: "close", ios: "xmark" } as const;

export function ReadingAsCard() {
	const { state, actions } = useHomeScreen();
	const reduced = useEffectiveReducedMotion();
	const [muted, separator] = useTokenColors(["muted", "separator"]);
	const [picks, setPicks] = useState<readonly string[]>([]);
	const options = state.home?.audiences.map((a) => a.slug) ?? [];
	const pick = (slug: string) => {
		Presets.System.selection();
		setPicks((p) => toggleIn(p, slug));
	};
	return (
		<View
			className="mx-4 mt-4 gap-3 bg-surface p-4"
			style={{
				borderCurve: "continuous",
				borderRadius: 24,
				boxShadow: `0px 0px 0px 1px ${separator}`,
			}}
		>
			<View className="flex-row items-start gap-3">
				<View className="flex-1 gap-0.5">
					<AppText
						accessibilityRole="header"
						className="text-[17px] leading-[22px]"
						variant="body"
						weight="semibold"
					>
						{COPY.readingAs.title}
					</AppText>
					<AppText
						className="text-[14px] leading-[19px]"
						color="muted"
						variant="callout"
					>
						{COPY.readingAs.line}
					</AppText>
				</View>
				<Pressable
					accessibilityLabel={COPY.readingAs.skip}
					accessibilityRole="button"
					className="-mt-1.5 -mr-1.5 size-8 items-center justify-center"
					hitSlop={8}
					onPress={() => actions.answerReadingAs([])}
				>
					<Icon color={muted} name={CLOSE} size={14} weight="semibold" />
				</Pressable>
			</View>
			<View className="flex-row flex-wrap gap-2">
				{options.map((slug) => {
					const on = picks.includes(slug);
					return (
						<PressScale
							accessibilityRole="checkbox"
							accessibilityState={{ checked: on }}
							className={cn(
								"justify-center",
								on ? "bg-accent" : "bg-surface-secondary"
							)}
							key={slug}
							onPress={() => pick(slug)}
							style={{
								borderRadius: CHIP.h / 2,
								height: CHIP.h,
								paddingHorizontal: CHIP.padH,
							}}
						>
							<AppText
								className="text-[14.5px] leading-[18px]"
								color={on ? "accentForeground" : "foreground"}
								variant="callout"
								weight="medium"
							>
								{facetLabel(slug)}
							</AppText>
						</PressScale>
					);
				})}
			</View>
			{picks.length > 0 ? (
				<Animated.View
					entering={fadeUp(0, LT.riseMs, LT.rise, reduced, LT.press)}
				>
					<PressScale
						className="h-11 items-center justify-center rounded-full bg-foreground"
						onPress={() => actions.answerReadingAs(picks)}
					>
						<AppText
							className="text-[15px] leading-[20px]"
							color="background"
							variant="callout"
							weight="semibold"
						>
							{COPY.readingAs.done}
						</AppText>
					</PressScale>
				</Animated.View>
			) : null}
		</View>
	);
}
