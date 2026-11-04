import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import type { SupportFrequency } from "@/features/session-end/check-in-offer";

// The intake's own labels, so a deferred answer means what a v1 answer means.
const OPTIONS: { label: string; value: SupportFrequency }[] = [
	{ label: "Every day", value: "every_day" },
	{ label: "Frequently", value: "frequently" },
	{ label: "Occasionally", value: "occasionally" },
	{ label: "Not sure", value: "not_sure" },
];

export const SUPPORT_FREQUENCY_COPY = {
	body: "Needing a moment like this one.",
	title: "Does this happen\na lot?",
};

/** The nudge's first beat for a v2 user (#712): one tap on "Does this happen a lot?",
 * two-up so it fits under Flux on a small phone. */
export function SupportFrequencyChoices({
	onAnswer,
	onSkip,
}: {
	onAnswer: (answer: SupportFrequency) => void;
	onSkip: () => void;
}) {
	return (
		<View className="gap-3">
			<View className="flex-row flex-wrap justify-between gap-y-3">
				{OPTIONS.map(({ label, value }) => (
					<PressableFeedback
						accessibilityLabel={label}
						accessibilityRole="button"
						className="w-[48.5%] items-center rounded-full border border-accent/30 bg-accent/10 py-4"
						key={value}
						onPress={() => {
							Presets.flick();
							onAnswer(value);
						}}
					>
						<AppText className="font-semibold text-accent text-base">
							{label}
						</AppText>
					</PressableFeedback>
				))}
			</View>
			<PressableFeedback
				accessibilityLabel="Skip this question"
				accessibilityRole="button"
				className="items-center rounded-full border border-border py-4"
				onPress={onSkip}
			>
				<AppText className="font-light text-base text-foreground/30">
					Skip
				</AppText>
			</PressableFeedback>
		</View>
	);
}
