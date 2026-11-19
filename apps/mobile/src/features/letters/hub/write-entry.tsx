import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { LETTERS } from "../copy";
import { openWrite } from "../letters-routes";
import { useLettersHubScreen } from "./hub-data";

/**
 * The top of the Letters screen (handoff §1): one line and Write a letter. When Write is off
 * (today's letter written, or three waiting) the line says why and the button dims; it still opens
 * the writing screen, which says the same, as the board does.
 */
export function WriteEntry() {
	const limit = useLettersHubScreen().state.status.writeLimit;
	return (
		<Card className="mx-4 gap-3 p-3.5" flat radius={20}>
			<AppText
				className="text-[14px] leading-[20px]"
				color="muted"
				variant="detail"
			>
				{limit ? LETTERS.limit[limit] : LETTERS.hub.writeLine}
			</AppText>
			<PressScale
				accessibilityHint={limit ? LETTERS.limit[limit] : undefined}
				accessibilityLabel={LETTERS.hub.write}
				accessibilityRole="button"
				className={cn(
					"min-h-[42px] items-center justify-center rounded-full py-2",
					limit ? "bg-surface-secondary" : "bg-ember"
				)}
				onPress={openWrite}
			>
				<View accessible={false}>
					<AppText
						className={limit ? undefined : "text-letter-on-ember"}
						color={limit ? "subtle" : undefined}
						variant="callout"
						weight="semibold"
					>
						{LETTERS.hub.write}
					</AppText>
				</View>
			</PressScale>
		</Card>
	);
}
