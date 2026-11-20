import { Image } from "expo-image";
import { type Ref, useEffect, useImperativeHandle } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScheme } from "@/design/scheme";
import { ArrivalChrome } from "@/features/achievements/arrival/arrival-chrome";
import { useArrivalFlow } from "@/features/achievements/arrival/arrival-flow";
import {
	type ArrivingBadge,
	type Milestone,
	milestoneLabel,
} from "@/features/achievements/arrival/arrival-model";
import { EV, geoFor, PH } from "@/features/achievements/arrival/arrival-motion";
import type { Still } from "@/features/achievements/arrival/arrival-start";
import { BadgeLayer } from "@/features/achievements/arrival/badge/badge-layer";
import { MilestoneLayer } from "@/features/achievements/arrival/milestone/milestone-layer";
import { ShownContext } from "@/features/achievements/arrival/once-shown";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const roomOf = (hasMs: boolean, dark: boolean) => {
	if (!hasMs) {
		return "bg-background";
	}
	return dark ? "bg-arrival-fire-dusk" : "bg-arrival-fire-day";
};

const silentEvents = (m: Milestone | null): number[] => [
	...(m?.week ? [] : [EV.today]),
	...(m?.freeze ? [] : [EV.token]),
];

export type ArrivalHandle = { start: () => void };

type Props = {
	badges: readonly ArrivingBadge[];
	milestone: Milestone | null;
	still?: Still;
	onDone: () => void;
	ref?: Ref<ArrivalHandle>;
};

export function Arrival({ badges, milestone, still, onDone, ref }: Props) {
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const geo = geoFor(width, height, insets.top);
	const rm = useEffectiveReducedMotion();
	const dark = useScheme() === "dark";
	const hasMs = milestone !== null;
	const flow = useArrivalFlow({
		hasMilestone: hasMs,
		onDone,
		reduced: rm,
		silent: silentEvents(milestone),
		still,
		total: badges.length,
	});
	const { eng, phase } = flow;
	useImperativeHandle(ref, () => ({ start: flow.start }));

	useEffect(() => {
		for (const b of badges) {
			if (typeof b.art.source === "string") {
				Image.prefetch(b.art.source).catch(() => undefined);
			}
		}
	}, [badges]);

	return (
		<ShownContext value={flow.shown}>
			<View className={cn("flex-1", roomOf(hasMs, dark))}>
				{milestone ? (
					<MilestoneLayer
						dark={dark}
						eng={eng}
						geo={geo}
						hidden
						label={milestoneLabel(milestone)}
						milestone={milestone}
						on={phase === PH.ms}
						ref={flow.msRef}
						rm={rm}
						wake={flow.wake}
					/>
				) : null}
				<View
					accessibilityElementsHidden={phase !== PH.badge}
					className="absolute inset-0"
					importantForAccessibility={
						phase === PH.badge ? "auto" : "no-hide-descendants"
					}
					pointerEvents={phase === PH.badge ? "box-none" : "none"}
				>
					<BadgeLayer
						badges={badges}
						dark={dark}
						eng={eng}
						fa={flow.fa}
						first={flow.first.step}
						geo={geo}
						titleRef={flow.titleRef}
						wake={flow.wake}
					/>
				</View>
				<ArrivalChrome
					dark={dark}
					eng={eng}
					first={flow.first}
					onClose={flow.close}
					onCta={flow.next}
					top={geo.dy}
					total={badges.length}
				/>
			</View>
		</ShownContext>
	);
}
