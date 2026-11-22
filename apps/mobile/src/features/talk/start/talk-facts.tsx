import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";
import type { TalkScreen } from "../talk-data";
import {
	footnoteLead,
	isLow,
	labelIn,
	type WeekLeft,
	weekFact,
} from "../talk-model";

const FACT = "text-[13.5px] leading-[18px]";
const SMALL = "text-[13px] leading-[18px]";
const FOOT = "text-[12.5px] leading-[17px]";
const CHEVRON: IconName = { android: "chevron_right", ios: "chevron.right" };
const CHEVRON_OPACITY = 0.7;

function Fact({
	icon,
	text,
	warn,
}: {
	icon: IconName;
	text: string;
	warn?: boolean;
}) {
	const accent = useTokenColor("accent");
	return (
		<View className="flex-row items-start gap-2.5">
			<Icon color={accent} name={icon} size={16} style={{ marginTop: 1 }} />
			<AppText
				className={`${FACT} flex-1`}
				color={warn ? "emberInk" : "muted"}
				variant="detail"
			>
				{text}
			</AppText>
		</View>
	);
}

export function TalkFacts({ name, week }: { name: string; week: WeekLeft }) {
	const { facts } = TALK_COPY.start;
	return (
		<View className="gap-[9px] px-7">
			<Fact
				icon={{ android: "auto_awesome", ios: "sparkles" }}
				text={facts.ai(name)}
			/>
			<Fact
				icon={{ android: "description", ios: "doc.text" }}
				text={facts.kept}
			/>
			<Fact
				icon={{ android: "schedule", ios: "clock" }}
				text={weekFact(week)}
				warn={isLow(week)}
			/>
		</View>
	);
}

export function PaceLine({
	state,
	onPress,
}: {
	state: Pick<TalkScreen["state"], "pace" | "directness" | "name">;
	onPress: () => void;
}) {
	const subtle = useTokenColor("subtle");
	const { start, style } = TALK_COPY;
	const pace = labelIn(style.pace, state.pace);
	const directness = labelIn(style.directness, state.directness);
	return (
		<Pressable
			accessibilityHint={style.title(state.name)}
			accessibilityLabel={start.paceLabel(pace, directness)}
			accessibilityRole="button"
			className="min-h-7.5 max-w-full flex-row items-center gap-[5px] self-center px-4"
			onPress={onPress}
		>
			<AppText
				className={`${SMALL} shrink text-center`}
				color="subtle"
				variant="footnote"
			>
				{`${start.pace} `}
				<AppText className={SMALL} variant="footnote" weight="medium">
					{pace}
				</AppText>
				{` · ${start.directness} `}
				<AppText className={SMALL} variant="footnote" weight="medium">
					{directness}
				</AppText>
			</AppText>
			<Icon
				color={subtle}
				name={CHEVRON}
				size={11}
				style={{ opacity: CHEVRON_OPACITY }}
				weight="semibold"
			/>
		</Pressable>
	);
}

export function Footnote({
	week,
	micAsk,
	locked,
	error,
	onKept,
}: {
	week: WeekLeft;
	micAsk: boolean;
	locked: boolean;
	error: string | null;
	onKept: () => void;
}) {
	if (error) {
		return (
			<AppText center className={FOOT} color="dangerInk" variant="caption">
				{error}
			</AppText>
		);
	}
	return (
		<AppText center className={FOOT} color="subtle" variant="caption">
			{footnoteLead(week, micAsk, locked)}
			<AppText
				accessibilityRole="link"
				className={FOOT}
				color="accent"
				onPress={onKept}
				variant="caption"
				weight="semibold"
			>
				{TALK_COPY.start.footnote.kept}
			</AppText>
		</AppText>
	);
}
