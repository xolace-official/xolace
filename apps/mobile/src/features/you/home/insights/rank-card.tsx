import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { InfoButton, InfoTip } from "@/components/shared/info-tip";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { COPY } from "@/features/you/copy";
import type { RankCard as Rank } from "@/features/you/home/you-model";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";

const TIP_TOP = 48;

export function RankCard({ rank }: { rank: Rank }) {
	const [info, setInfo] = useState(false);
	return (
		<Surface className="p-4">
			<View className="flex-row items-center gap-1.75">
				<AppText
					accessibilityRole="header"
					className="text-[17px] leading-[22px] tracking-[-0.17px]"
					variant="headline"
				>
					{COPY.rank.title}
				</AppText>
				<InfoButton
					label={COPY.rank.infoLabel}
					onPress={() => setInfo((v) => !v)}
				/>
			</View>
			<View accessible className="mt-2.5 flex-row items-baseline gap-2">
				{rank.pct ? (
					<AppText
						className="text-[34px] leading-[38px] tracking-[-1px]"
						color="emberInk"
						variant="display"
					>
						{rank.pct}
					</AppText>
				) : null}
				<AppText
					className="flex-1 text-[14px] leading-[19px]"
					color="muted"
					variant="callout"
				>
					{rank.line}
				</AppText>
			</View>
			<AppText
				className="mt-2.5 text-[12.5px] leading-4"
				color="subtle"
				variant="footnote"
			>
				{rank.foot}
			</AppText>
			{info ? (
				<InfoTip
					body={COPY.rank.info}
					onClose={() => setInfo(false)}
					title={COPY.rank.title}
					top={TIP_TOP}
				/>
			) : null}
		</Surface>
	);
}

export function PlusRow({ onPress }: { onPress: () => void }) {
	const [emberWash = "", accentWash = "", subtle = ""] = useTokenColors([
		"ember-wash",
		"accent-wash",
		"subtle",
	]);
	return (
		<PressScale
			accessibilityLabel={COPY.insights.plusLabel}
			accessibilityRole="button"
			card
			haptic={playSoftPress}
			onPress={onPress}
		>
			<LinearGradient
				className="flex-row items-center gap-3 rounded-[22px] px-4 py-3.5"
				colors={[emberWash, accentWash]}
				end={{ x: 1, y: 0.7 }}
				start={{ x: 0, y: 0.3 }}
			>
				<View className="flex-1">
					<AppText
						className="text-[14px] leading-[19px]"
						variant="callout"
						weight="semibold"
					>
						{COPY.insights.plusTitle}
					</AppText>
					<AppText
						className="mt-0.5 text-[12.5px] leading-4"
						color="muted"
						variant="footnote"
						weight="medium"
					>
						{COPY.insights.plusSub}
					</AppText>
				</View>
				<Icon
					color={subtle}
					name={{ android: "chevron_right", ios: "chevron.right" }}
					size={14}
					weight="semibold"
				/>
			</LinearGradient>
		</PressScale>
	);
}
