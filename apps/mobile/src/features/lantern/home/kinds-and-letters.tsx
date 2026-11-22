import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { COPY } from "@/features/lantern/copy";
import { useHomeScreen } from "@/features/lantern/home/home-data";
import { kindHref, subjectsHref } from "@/features/lantern/lantern-links";
import {
	KINDS,
	type Kind,
	LETTERS,
	lettersWith,
} from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const ART: Record<Kind, number> = {
	advice: require("@/assets/images/flux/flux-campfire.png"),
	explainer: require("@/assets/images/flux/writer-flux.png"),
	story: require("@/assets/images/flux/flux-pair-listening.png"),
};

export function KindRows() {
	const separator = useTokenColor("separator");
	return (
		<View style={{ gap: LS.kind.gap, paddingHorizontal: LS.gutter }}>
			{KINDS.map((kind) => {
				const { label, line } = COPY.kinds[kind];
				return (
					<PressScale
						accessibilityLabel={`${label}. ${line}`}
						accessibilityRole="link"
						card
						className="flex-row items-center gap-4 bg-surface py-2 pr-2 pl-5"
						key={kind}
						onPress={() => router.push(kindHref(kind))}
						style={{
							borderCurve: "continuous",
							borderRadius: LS.kind.r,
							boxShadow: `0px 0px 0px 1px ${separator}`,
						}}
					>
						<View className="flex-1 gap-0.5">
							<AppText
								className="text-[17px] leading-[22px]"
								variant="body"
								weight="semibold"
							>
								{label}
							</AppText>
							<AppText
								className="text-[14px] leading-[19px]"
								color="muted"
								variant="callout"
							>
								{line}
							</AppText>
						</View>
						<Image
							contentFit="contain"
							source={ART[kind]}
							style={{ height: LS.kind.art, width: LS.kind.art }}
						/>
					</PressScale>
				);
			})}
		</View>
	);
}

export function LetterStrip() {
	const has = lettersWith(useHomeScreen().state.subjects ?? []);
	return (
		<View
			className="flex-row flex-wrap justify-between"
			style={{ paddingHorizontal: LS.gutter, rowGap: LS.az.rowGap }}
		>
			{LETTERS.map((l) => {
				const on = has.has(l);
				return (
					<Pressable
						accessibilityLabel={COPY.home.lettersLabel(l)}
						accessibilityRole="link"
						accessibilityState={{ disabled: !on }}
						className={cn(
							"items-center justify-center active:bg-surface-secondary",
							!on && "opacity-42"
						)}
						disabled={!on}
						key={l}
						onPress={() => router.push(subjectsHref(l))}
						style={{
							borderRadius: LS.az.size / 2,
							height: LS.az.size,
							width: LS.az.size,
						}}
					>
						<AppText
							className="text-[16px] leading-[20px]"
							color={on ? "foreground" : "subtle"}
							variant="subhead"
							weight={on ? "semibold" : "regular"}
						>
							{l}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}
