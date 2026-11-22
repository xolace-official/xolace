import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { LinearGradient } from "@/components/shared/styled";
import { HOME_COPY, HOME_ICONS } from "@/features/settings/home/copy";
import type { PlusCard as Card } from "@/features/settings/home/home-model";
import { PlusHighlight } from "@/features/settings/home/plus/plus-highlight";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const C = HOME_COPY.plus;
const FROM = { x: 0.09, y: 0.21 };
const TO = { x: 0.91, y: 0.79 };
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;
const H_PLUS = 138;
const H_FREE = 166;

export function PlusCard({
	card,
	onPress,
}: {
	card: Card;
	onPress: () => void;
}) {
	const from = useTokenColor("plus-card-from");
	const to = useTokenColor("plus-card-to");
	const white = useTokenColor("on-art");
	const glow = useTokenColor("plus-card-glow");
	const plus = card.kind === "plus";
	const opens = card.opensPaywall;
	return (
		<Pressable
			accessibilityLabel={card.a11y}
			accessibilityRole={opens ? "button" : "summary"}
			className="mx-4 mb-7.5 rounded-[24px] border-continuous"
			disabled={!opens}
			onPress={() => {
				playSoftPress();
				onPress();
			}}
			style={{ boxShadow: `0px 14px 30px -18px ${glow}` }}
		>
			<LinearGradient
				className="overflow-hidden rounded-[24px] border-continuous px-4.5 py-4"
				colors={[from, to]}
				end={TO}
				start={FROM}
				style={card.kind === "loading" ? { minHeight: H_PLUS } : undefined}
			>
				<PlusHighlight height={card.kind === "free" ? H_FREE : H_PLUS} />
				<View className="flex-row items-center gap-2.5">
					<View className="size-7.5 items-center justify-center rounded-[9px] border-continuous bg-on-art/16">
						<Icon color={white} name={HOME_ICONS.plus} size={17} />
					</View>
					<AppText
						className="text-[17px] text-on-art leading-[22px]"
						variant="body"
						weight="semibold"
					>
						{C.name}
					</AppText>
					{plus ? (
						<View className="rounded-full bg-on-art/18 px-2 py-0.75">
							<AppText
								className="text-[12px] text-on-art leading-[15px]"
								variant="body"
								weight="semibold"
							>
								{C.active}
							</AppText>
						</View>
					) : null}
					<View className="flex-1" />
					{opens ? (
						<View className="opacity-70">
							<Icon color={white} name={CHEVRON} size={14} weight="bold" />
						</View>
					) : null}
				</View>
				{plus ? <PlusTime card={card} /> : null}
				{card.kind === "free" ? <FreeOffer /> : null}
			</LinearGradient>
		</Pressable>
	);
}

function PlusTime({ card }: { card: Extract<Card, { kind: "plus" }> }) {
	return (
		<>
			{card.line ? (
				<AppText
					className="mt-3.5 text-[15px] text-on-art leading-[21px] opacity-94"
					variant="body"
				>
					{card.line}
				</AppText>
			) : null}
			{card.fill === null ? null : (
				<View className="mt-2.5 h-1.5 overflow-hidden rounded-[3px] bg-on-art/20">
					<View
						className="h-full rounded-[3px] bg-on-art"
						style={{ width: `${card.fill * 100}%` }}
					/>
				</View>
			)}
			<View className="mt-2 flex-row justify-between opacity-72">
				<AppText
					className="text-[13px] text-on-art leading-[17px]"
					variant="body"
				>
					{C.refills}
				</AppText>
				<AppText
					className="text-[13px] text-on-art leading-[17px]"
					variant="body"
				>
					{C.weekly}
				</AppText>
			</View>
		</>
	);
}

function FreeOffer() {
	return (
		<>
			<AppText
				className="mt-3.5 text-[15px] text-on-art leading-[21px] opacity-94"
				variant="body"
			>
				{C.freeLine}
			</AppText>
			<View className="mt-3.5 h-8.5 justify-center self-start rounded-full bg-on-art px-3.5">
				<AppText
					className="text-[15px] text-plus-card-ink leading-5"
					variant="body"
					weight="semibold"
				>
					{C.cta}
				</AppText>
			</View>
		</>
	);
}
