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
import { geoFor, PH } from "@/features/achievements/arrival/arrival-motion";
import type { Still } from "@/features/achievements/arrival/arrival-start";
import { BadgeLayer } from "@/features/achievements/arrival/badge/badge-layer";
import { MilestoneLayer } from "@/features/achievements/arrival/milestone/milestone-layer";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** A milestone plays in the fire's room; badges alone on the page. */
const roomOf = (hasMs: boolean, dark: boolean) => {
	if (!hasMs) {
		return "bg-background";
	}
	return dark ? "bg-arrival-fire-dusk" : "bg-arrival-fire-day";
};

/** Starts an arrival staged hidden (by the host): a fresh engine and the clock. */
export type ArrivalHandle = { start: () => void };

type Props = {
	badges: readonly ArrivingBadge[];
	milestone: Milestone | null;
	/** A dev state's held frame. */
	still?: Still;
	/** Everything has faded: leave (go back, or the host fades out). */
	onDone: () => void;
	ref?: Ref<ArrivalHandle>;
};

/**
 * One full-screen moment (arrivals §2, §3): the milestone if there is one, then
 * each badge in turn. One clock steps the engine on the UI thread and stops when
 * nothing moves; React renders only on Next and once per sparks number.
 */
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
		still,
		total: badges.length,
	});
	const { eng, phase } = flow;
	useImperativeHandle(ref, () => ({ start: flow.start }));

	// Nothing mounts late: decode every badge's art now (§6).
	useEffect(() => {
		for (const b of badges) {
			if (typeof b.art.source === "string") {
				Image.prefetch(b.art.source).catch(() => undefined);
			}
		}
	}, [badges]);

	return (
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
	);
}
