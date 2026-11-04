// The three moments of one rough week (#713, README § I), each told the free way or the
// Plus way: one honest line on Free, one benefit and its visual on Plus.
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import type { PlusSide } from "@/features/intake/v2/machine";
import {
	KindlingHold,
	TalkBar,
} from "@/features/intake/v2/plus/moment-visuals";
import { SteadinessExample } from "@/features/intake/v2/plus/steadiness-example";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";

const SWAP_MS = 350;

type Moment = {
	benefit: string;
	free: string;
	title: string;
	visual: () => ReactNode;
	when: string;
};

const MOMENTS: Moment[] = [
	{
		benefit: "Talk it out before it's named.",
		free: "You type it once and the Mirror names it.",
		title: "Work won't leave your head.",
		visual: () => <TalkBar />,
		when: "Tue night",
	},
	{
		benefit: "Get support, not just a name.",
		free: "The Mirror says it's guilt. Then you're on your own with it.",
		title: "You know what it is. Now what?",
		visual: () => <KindlingHold />,
		when: "Thu night",
	},
	{
		benefit: "Catch what's compounding.",
		free: "You can tell it's been heavy. Not what's building, or since when.",
		title: "Why does this keep happening?",
		visual: () => <SteadinessExample />,
		when: "Sun night",
	},
];

export function MomentCards({ side }: { side: PlusSide }) {
	return (
		<View className="gap-2.5">
			{MOMENTS.map((moment) => (
				<MomentCard key={moment.when} moment={moment} side={side} />
			))}
		</View>
	);
}

function MomentCard({ moment, side }: { moment: Moment; side: PlusSide }) {
	const reduced = useEffectiveReducedMotion();
	const plus = side === "plus";
	return (
		<View
			className={cn(
				"gap-2.5 rounded-[22px] border px-[18px] py-4",
				plus ? "border-ember/25 bg-surface" : "border-border bg-surface/60"
			)}
			style={{ borderCurve: "continuous" }}
		>
			<View className="flex-row items-baseline justify-between gap-2.5">
				<AppText className="flex-1 font-[Poppins-SemiBold] text-[15px] text-foreground">
					{moment.title}
				</AppText>
				<AppText className="text-[12px] text-muted">{moment.when}</AppText>
			</View>
			{/* Keyed by side, so each flip fades the new side in. */}
			<Animated.View
				className="gap-3"
				entering={reduced ? undefined : FadeIn.duration(SWAP_MS)}
				key={side}
			>
				{plus ? (
					<>
						<AppText className="font-[Poppins-SemiBold] text-[19px] text-ember leading-6">
							{moment.benefit}
						</AppText>
						{moment.visual()}
					</>
				) : (
					<AppText className="text-[14px] text-muted leading-[21px]">
						{moment.free}
					</AppText>
				)}
			</Animated.View>
		</View>
	);
}
