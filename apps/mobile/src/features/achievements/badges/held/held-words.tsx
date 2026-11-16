import type { RefObject } from "react";
import { type TextInstance, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import {
	longDate,
	sparksLine,
} from "@/features/achievements/achievements-model";
import {
	type BadgeView,
	heldHint,
} from "@/features/achievements/badges/badges-model";
import {
	NAME_H,
	Name,
	Part,
	Reveal,
} from "@/features/achievements/badges/held/reveal";
import { type Pose, RV } from "@/features/achievements/coin/pose";
import { COPY } from "@/features/achievements/copy";
import { cn } from "@/lib/cn";
/** The board's tops (on its 844 pt phone); `dy` shifts them by the status bar. */
export const TOP = {
	chrome: 56,
	date: 556,
	hint: 640,
	line: 160,
	prog: 562,
	sparks: 582,
	sparksLocked: 618,
};

/** The badge page's words: the title growing out of the label, then the line, the date or progress, the sparks and the hint. */
export function HeldWords({
	pose,
	badge,
	dy,
	width,
	reduced,
	titleRef,
}: {
	pose: SharedValue<Pose>;
	badge: BadgeView | undefined;
	dy: number;
	width: number;
	reduced: boolean;
	titleRef: RefObject<TextInstance | null>;
}) {
	const earned = badge?.earnedAt !== undefined;
	const top = (y: number) => ({ top: y + dy });
	return (
		<>
			<Name pose={pose} width={width}>
				<AppText
					accessibilityRole="header"
					center
					className="text-[30px] tracking-[-0.45px]"
					maxFontSizeMultiplier={1}
					numberOfLines={1}
					ref={titleRef}
					style={{ height: NAME_H, lineHeight: NAME_H, width }}
					variant="title"
				>
					{badge?.title}
				</AppText>
			</Name>
			<Reveal
				className="inset-x-9"
				i={RV.line}
				pose={pose}
				style={top(TOP.line)}
			>
				<AppText
					center
					className="text-[16px] text-foreground/72 leading-6"
					variant="body"
				>
					{badge?.copy}
				</AppText>
			</Reveal>
			<Part on={earned}>
				<Reveal
					className="inset-x-0"
					i={RV.date}
					pose={pose}
					style={top(TOP.date)}
				>
					<AppText
						center
						className="text-[15px] text-foreground/62 leading-5"
						variant="body"
					>
						{badge?.earnedAt === undefined
							? ""
							: COPY.badge.unlockedOn(longDate(badge.earnedAt))}
					</AppText>
				</Reveal>
			</Part>
			<Part on={!earned && badge?.progress !== undefined}>
				<Reveal
					className="inset-x-0 items-center"
					i={RV.date}
					pose={pose}
					style={top(TOP.prog)}
				>
					<View className="h-1.5 w-56 overflow-hidden rounded-[3px] bg-separator">
						<View
							className="h-1.5 rounded-[3px] bg-ember"
							style={{ width: `${(badge?.progress?.share ?? 0) * 100}%` }}
						/>
					</View>
					<AppText
						className="mt-2.5 text-[15px] text-foreground/62 leading-5"
						variant="body"
					>
						{badge?.progress?.label}
					</AppText>
				</Reveal>
			</Part>
			<Reveal
				className="inset-x-0"
				i={RV.sparks}
				pose={pose}
				style={top(earned ? TOP.sparks : TOP.sparksLocked)}
			>
				<AppText
					center
					className={cn(
						"text-[14px] leading-[18px]",
						earned ? "text-ember-ink" : "text-foreground/62"
					)}
					variant="body"
					weight={earned ? "semibold" : "medium"}
				>
					{badge ? sparksLine(badge.sparks, earned) : ""}
				</AppText>
			</Reveal>
			<Reveal
				className="inset-x-0"
				i={RV.hint}
				pose={pose}
				style={top(TOP.hint)}
			>
				<AppText
					center
					className="text-[12px] text-foreground/50 leading-4"
					variant="body"
				>
					{heldHint(earned, reduced)}
				</AppText>
			</Reveal>
		</>
	);
}
