import { api } from "@xolace/backend/convex/_generated/api";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";

type Stats = FunctionReturnType<typeof api.intake.campfireStats>;

const FADE_MS = 320;

/** Read once per mount, not subscribed: the stats scan recent sessions app-wide, so a live
 * Discovery subscription would re-run on every user's session. A failed read hides the card. */
function useCampfireStatsOnce() {
	const convex = useConvex();
	const [stats, setStats] = useState<Stats | null>(null);

	useEffect(() => {
		let cancelled = false;
		convex
			.query(api.intake.campfireStats, {})
			.then((result) => {
				if (!cancelled) {
					setStats(result);
				}
			})
			.catch(() => {
				// best-effort social proof
			});
		return () => {
			cancelled = true;
		};
	}, [convex]);

	return stats;
}

/** The v2 intake's campfire count, moved to Discovery (#712): `intake.campfireStats`, one
 * real number and never an outcome promise; a thin sample drops the second line. */
export function CampfireCard() {
	const stats = useCampfireStatsOnce();

	if (!stats) {
		return null;
	}

	const count = stats.campers.toLocaleString();
	const sat = `${stats.campers === 1 ? "person has" : "people have"} sat by this fire.`;
	const lighter =
		stats.lighterPercent === null
			? null
			: `When they say how they feel afterwards, ${stats.lighterPercent}% say lighter.`;

	return (
		<Animated.View entering={FadeIn.duration(FADE_MS)}>
			<View
				accessibilityLabel={[count, sat, lighter].filter(Boolean).join(" ")}
				accessibilityRole="text"
				accessible
				className="gap-2 rounded-3xl border border-border/65 bg-surface px-5 py-5"
			>
				<AppText className="font-[Poppins-SemiBold] text-[40px] text-ember leading-12">
					{count}
				</AppText>
				<AppText className="font-[Poppins-Medium] text-[17px] text-foreground leading-6">
					{sat}
				</AppText>
				{lighter && (
					<AppText className="text-[14px] text-muted leading-5">
						{lighter}
					</AppText>
				)}
			</View>
		</Animated.View>
	);
}
