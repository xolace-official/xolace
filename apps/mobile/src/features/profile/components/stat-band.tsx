import { Surface } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import {
	FADE_IN,
	FADE_OUT,
	GlassSurface,
} from "@/src/components/shared/glass-surface";
import { useIsPlayful } from "@/src/lib/playful/use-playful";

type Stat = { value: string; label: string; sub?: string; amber?: boolean };

type Props = {
	sessionCount: number;
	currentStreak: number;
	longestStreak: number;
	usualDay: string | null;
	staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function StatBand({
	sessionCount,
	currentStreak,
	longestStreak,
	usualDay,
	staggerDelay = 120,
}: Props) {
	const isPlayful = useIsPlayful();
	const stats: Stat[] = [
		{
			label: sessionCount === 1 ? "Moment" : "Moments",
			value: String(sessionCount),
		},
		{
			amber: currentStreak > 0,
			label: "Day streak",
			// Show the personal best only when it beats the current run — when the
			// current streak is the record, the big number already says it.
			sub: longestStreak > currentStreak ? `Best ${longestStreak}` : undefined,
			value: currentStreak > 0 ? String(currentStreak) : "—",
		},
	];
	if (usualDay) {
		stats.push({ label: "Usual day", value: usualDay });
	}

	const cells = stats.map((s, i) => (
		<View
			className={`flex-1 items-center px-1.5 ${i > 0 ? "border-separator/50 border-l" : ""}`}
			key={s.label}
		>
			<AppText
				className={`font-bold text-[21px] tracking-tight ${s.amber ? "text-ember" : "text-foreground"}`}
			>
				{s.value}
			</AppText>
			<AppText className="mt-1 text-[10.5px] text-muted/80 uppercase tracking-wide">
				{s.label}
			</AppText>
			{s.sub ? (
				<AppText className="mt-0.5 text-[9.5px] text-ember/70 tracking-wide">
					{s.sub}
				</AppText>
			) : null}
		</View>
	));

	return (
		// Glass stops rendering under an animated opacity, so the fade only runs where there is no glass.
		<EaseView
			animate={{ translateY: 0, ...FADE_OUT }}
			className="mt-7 px-5"
			initialAnimate={{ translateY: 8, ...FADE_IN }}
			transition={{
				delay: staggerDelay,
				duration: 300,
				easing: EASE,
				type: "timing",
			}}
		>
			{isPlayful ? (
				// Playful trades the glass for a solid Surface, which the theme lips.
				<Surface className="flex-row px-3 py-5">{cells}</Surface>
			) : (
				<GlassSurface className="flex-row px-3 py-5" radius={24}>
					{cells}
				</GlassSurface>
			)}
		</EaseView>
	);
}
