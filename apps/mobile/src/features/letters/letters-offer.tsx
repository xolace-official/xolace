import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { LETTERS } from "./copy";
import { LetterPill } from "./letter-pill";
import type { OptIn } from "./letters-model";

/**
 * "Receive letters too?" (handoff §1): the line, then Yes and Not now. Asked once: Not now never
 * asks again, and only Settings › Privacy turns it on after that. `short`: the Letters screen's
 * title, "Receive letters?". Shared by Connect's card and the Letters screen's For you.
 */
export function LettersOffer({
	short = false,
	onAnswer,
	className,
}: {
	short?: boolean;
	onAnswer: (optIn: Exclude<OptIn, "unset">) => void;
	className?: string;
}) {
	return (
		<View className={cn("gap-1.5", className)}>
			<AppText accessibilityRole="header" variant="callout" weight="semibold">
				{short ? LETTERS.hub.offerTitle : LETTERS.offer.title}
			</AppText>
			<AppText className="leading-[19px]" color="muted" variant="detail">
				{LETTERS.offer.body}
			</AppText>
			<View className="mt-1 flex-row flex-wrap gap-1">
				<LetterPill
					a11y={LETTERS.offer.yesA11y}
					label={LETTERS.offer.yes}
					onPress={() => onAnswer("yes")}
				/>
				<LetterPill
					label={LETTERS.offer.notNow}
					onPress={() => onAnswer("no")}
					plain
				/>
			</View>
		</View>
	);
}
