import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge";
import { ProgressBar } from "./progress-bar";
import type { AchievementsOverview } from "./types";

const LATEST_SIZE = 96;

type Props = { sparks: AchievementsOverview["sparks"] };

/** The top card (#684): latest earned badge, sparks earned large, then the rung closest to done. */
export function SparksCard({ sparks }: Props) {
	const { badgeCount, balance, earned, latest, nextUp } = sparks;
	return (
		<View className="mx-5 rounded-3xl bg-surface p-5">
			<View className="flex-row items-center gap-4">
				{latest ? <Badge achievement={latest} size={LATEST_SIZE} /> : null}
				<View className="flex-1">
					<AppText className="text-[11px] text-muted uppercase tracking-wide">
						Sparks earned
					</AppText>
					<AppText className="font-bold text-[34px] text-ember leading-10">
						{earned}
					</AppText>
					<AppText className="text-[13px] text-muted">
						{balance} to spend · {badgeCount}{" "}
						{badgeCount === 1 ? "badge" : "badges"}
					</AppText>
					{latest ? (
						<AppText
							className="mt-1 text-[12px] text-foreground/70"
							numberOfLines={1}
						>
							Latest: {latest.title}
						</AppText>
					) : null}
				</View>
			</View>
			{nextUp?.progress ? (
				<View className="mt-4 border-separator/50 border-t pt-3">
					<View className="flex-row justify-between gap-3">
						<AppText
							className="flex-1 text-[12px] text-foreground/70"
							numberOfLines={1}
						>
							Next up: {nextUp.title}
						</AppText>
						<AppText className="text-[12px] text-muted">
							{nextUp.progress.current}/{nextUp.progress.target}
						</AppText>
					</View>
					<ProgressBar className="mt-2 h-1.5" progress={nextUp.progress} />
				</View>
			) : null}
		</View>
	);
}
